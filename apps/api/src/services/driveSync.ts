import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { days, miniProjects, resources } from "../db/schema.js";
import { DAY_SCHEDULE, getDayScheduleEntry } from "../db/daySchedule.js";
import { env } from "../env.js";
import {
  classifyDriveFile,
  type ClassifiedMiniProject,
  type ClassifiedResource,
} from "../lib/driveClassifier.js";
import {
  downloadDriveFileText,
  extractGoogleDriveIdFromUrl,
  GOOGLE_SLIDES_MIME,
  isMarkdownFile,
  listDriveFolderTree,
  type DriveFileEntry,
} from "../lib/driveClient.js";

export interface DriveSyncOptions {
  force?: boolean;
  apiKey?: string;
  folderId?: string;
}

export interface DriveSyncResult {
  source: "drive";
  scannedFiles: number;
  downloadedFiles: number;
  skippedUnchanged: number;
  daysCreated: number;
  daysUpdated: number;
  resourcesCreated: number;
  resourcesUpdated: number;
  miniProjectsCreated: number;
  miniProjectsUpdated: number;
  warnings: string[];
  durationMs: number;
}

const DOWNLOAD_CONCURRENCY = 5;

let inFlightSync: Promise<DriveSyncResult> | null = null;

function isSameTimestamp(a: Date | null, bIso: string | null): boolean {
  if (!a || !bIso) return false;
  const parsed = new Date(bIso);
  if (Number.isNaN(parsed.getTime())) return false;
  return a.getTime() === parsed.getTime();
}

function isUnchangedRecord(
  existing:
    | {
        driveFileId: string | null;
        driveModifiedTime: Date | null;
        driveMd5Checksum: string | null;
      }
    | undefined,
  file: DriveFileEntry,
  force: boolean
): boolean {
  if (force || !existing || existing.driveFileId !== file.id) {
    return false;
  }
  if (file.md5Checksum && existing.driveMd5Checksum) {
    return file.md5Checksum === existing.driveMd5Checksum;
  }
  return isSameTimestamp(existing.driveModifiedTime, file.modifiedTime);
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await worker(items[idx]);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

async function executeDriveSync(
  options: DriveSyncOptions
): Promise<DriveSyncResult> {
  const startedAt = Date.now();
  const apiKey = (options.apiKey ?? env.GOOGLE_DRIVE_API_KEY).trim();
  const folderId = (options.folderId ?? env.GOOGLE_DRIVE_FOLDER_ID).trim();
  const force = Boolean(options.force);

  if (!apiKey) {
    throw new Error(
      "GOOGLE_DRIVE_API_KEY is not configured. Set GOOGLE_DRIVE_API_KEY in your environment to sync from Google Drive."
    );
  }
  if (!folderId) {
    throw new Error(
      "GOOGLE_DRIVE_FOLDER_ID is not configured. Set GOOGLE_DRIVE_FOLDER_ID in your environment."
    );
  }

  const summary: DriveSyncResult = {
    source: "drive",
    scannedFiles: 0,
    downloadedFiles: 0,
    skippedUnchanged: 0,
    daysCreated: 0,
    daysUpdated: 0,
    resourcesCreated: 0,
    resourcesUpdated: 0,
    miniProjectsCreated: 0,
    miniProjectsUpdated: 0,
    warnings: [],
    durationMs: 0,
  };

  // 1. List public Drive folder recursively
  const driveFiles = await listDriveFolderTree(folderId, apiKey);
  summary.scannedFiles = driveFiles.length;
  const activeDriveIds = new Set(driveFiles.map((f) => f.id));

  // 2. Load existing DB state for incremental diffing & legacy URL backfill
  const [existingDays, existingResources, existingMiniProjects] =
    await Promise.all([
      db.query.days.findMany(),
      db.query.resources.findMany(),
      db.query.miniProjects.findMany(),
    ]);

  const dayByNumber = new Map(existingDays.map((d) => [d.dayNumber, d]));
  const dayNumberById = new Map(existingDays.map((d) => [d.id, d.dayNumber]));

  const resourceByDriveId = new Map<string, (typeof existingResources)[number]>();
  for (const res of existingResources) {
    if (res.driveFileId) {
      resourceByDriveId.set(res.driveFileId, res);
    } else if (res.url) {
      const extracted = extractGoogleDriveIdFromUrl(res.url);
      if (extracted && !resourceByDriveId.has(extracted)) {
        resourceByDriveId.set(extracted, res);
      }
    }
  }

  const miniProjectByDriveId = new Map<
    string,
    (typeof existingMiniProjects)[number]
  >();
  const miniProjectByDayNumber = new Map<
    number,
    (typeof existingMiniProjects)[number]
  >();
  for (const mp of existingMiniProjects) {
    if (mp.driveFileId) {
      miniProjectByDriveId.set(mp.driveFileId, mp);
    }
    if (mp.dayId) {
      const dayNum = dayNumberById.get(mp.dayId);
      if (dayNum !== undefined && !miniProjectByDayNumber.has(dayNum)) {
        miniProjectByDayNumber.set(dayNum, mp);
      }
    }
  }

  // 3. Determine which files need downloading vs. can be skipped
  const filesToDownload: DriveFileEntry[] = [];
  const classifiedResources: ClassifiedResource[] = [];
  const classifiedMiniProjects: ClassifiedMiniProject[] = [];

  for (const file of driveFiles) {
    if (file.name.startsWith("_") || file.name.startsWith(".")) {
      continue;
    }

    if (file.mimeType === GOOGLE_SLIDES_MIME) {
      const existing = resourceByDriveId.get(file.id);
      if (
        isUnchangedRecord(existing, file, force) &&
        existing?.title === file.name.trim()
      ) {
        summary.skippedUnchanged += 1;
        continue;
      }

      const classified = classifyDriveFile(file);
      if (classified.kind === "resource") {
        classifiedResources.push(classified);
      } else if (classified.kind === "unclassified") {
        summary.warnings.push(classified.reason);
      }
      continue;
    }

    if (!isMarkdownFile(file)) {
      continue;
    }

    const folder = (file.folderName ?? "").trim().toLowerCase();
    const existingRecord =
      folder === "mini-projects"
        ? miniProjectByDriveId.get(file.id)
        : resourceByDriveId.get(file.id);

    if (isUnchangedRecord(existingRecord, file, force)) {
      summary.skippedUnchanged += 1;
      continue;
    }

    filesToDownload.push(file);
  }

  // 4. Download changed/new markdown files with bounded concurrency
  const downloadResults = await runWithConcurrency(
    filesToDownload,
    DOWNLOAD_CONCURRENCY,
    async (file) => {
      try {
        const text = await downloadDriveFileText(file.id, apiKey);
        return { file, text, error: null as string | null };
      } catch (err) {
        return {
          file,
          text: null as string | null,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  );

  for (const item of downloadResults) {
    if (item.error || item.text === null) {
      summary.warnings.push(
        `Failed to download "${item.file.sourcePath}": ${item.error ?? "Empty response"}`
      );
      continue;
    }

    summary.downloadedFiles += 1;
    const classified = classifyDriveFile(item.file, item.text);
    if (classified.kind === "resource") {
      classifiedResources.push(classified);
    } else if (classified.kind === "mini-project") {
      classifiedMiniProjects.push(classified);
    } else if (classified.kind === "unclassified") {
      summary.warnings.push(classified.reason);
    }
  }

  // 5. Upsert days, resources, and mini-projects inside a transaction
  const neededDayNumbers = new Set<number>(
    DAY_SCHEDULE.map((d) => d.dayNumber)
  );
  for (const r of classifiedResources) neededDayNumbers.add(r.dayNumber);
  for (const mp of classifiedMiniProjects) neededDayNumbers.add(mp.dayNumber);

  const sortedDayNumbers = Array.from(neededDayNumbers).sort((a, b) => a - b);

  await db.transaction(async (tx) => {
    const now = new Date();
    const dayMap = new Map<
      number,
      { id: string; publishedAt: Date | null }
    >();

    for (const dayNumber of sortedDayNumbers) {
      const schedule = getDayScheduleEntry(dayNumber);
      const existingDay = dayByNumber.get(dayNumber);

      if (existingDay) {
        dayMap.set(dayNumber, {
          id: existingDay.id,
          publishedAt: existingDay.publishedAt,
        });
      } else {
        const [created] = await tx
          .insert(days)
          .values({
            dayNumber: schedule.dayNumber,
            title: schedule.title,
            date: schedule.date,
            summary: schedule.summary,
            publishedAt: schedule.publishedAt,
          })
          .returning();
        dayMap.set(dayNumber, {
          id: created.id,
          publishedAt: created.publishedAt,
        });
        summary.daysCreated += 1;
      }
    }

    const matchedResourceIds = new Set<string>();

    for (const resItem of classifiedResources) {
      const targetDay = dayMap.get(resItem.dayNumber);
      if (!targetDay) continue;
      const schedule = getDayScheduleEntry(resItem.dayNumber);

      let match = resourceByDriveId.get(resItem.driveFileId);
      if (match && matchedResourceIds.has(match.id)) {
        match = undefined;
      }
      if (!match) {
        match = existingResources.find(
          (r) =>
            !matchedResourceIds.has(r.id) &&
            !r.driveFileId &&
            r.dayId === targetDay.id &&
            r.title === resItem.title
        );
      }

      if (match) {
        matchedResourceIds.add(match.id);
        await tx
          .update(resources)
          .set({
            dayId: targetDay.id,
            title: resItem.title,
            description: resItem.description,
            type: resItem.type,
            url: resItem.url,
            content: resItem.content,
            order: resItem.order,
            driveFileId: resItem.driveFileId,
            driveModifiedTime: resItem.driveModifiedTime,
            driveMd5Checksum: resItem.driveMd5Checksum,
            driveSourcePath: resItem.driveSourcePath,
            updatedAt: now,
          })
          .where(eq(resources.id, match.id));
        summary.resourcesUpdated += 1;
      } else {
        await tx.insert(resources).values({
          dayId: targetDay.id,
          title: resItem.title,
          description: resItem.description,
          type: resItem.type,
          url: resItem.url,
          content: resItem.content,
          order: resItem.order,
          publishedAt: targetDay.publishedAt ?? schedule.publishedAt,
          driveFileId: resItem.driveFileId,
          driveModifiedTime: resItem.driveModifiedTime,
          driveMd5Checksum: resItem.driveMd5Checksum,
          driveSourcePath: resItem.driveSourcePath,
        });
        summary.resourcesCreated += 1;
      }
    }

    for (const mpItem of classifiedMiniProjects) {
      const targetDay = dayMap.get(mpItem.dayNumber);
      if (!targetDay) continue;
      const schedule = getDayScheduleEntry(mpItem.dayNumber);
      const defaults = schedule.miniProject;

      const match =
        miniProjectByDriveId.get(mpItem.driveFileId) ??
        miniProjectByDayNumber.get(mpItem.dayNumber);

      if (match) {
        await tx
          .update(miniProjects)
          .set({
            dayId: targetDay.id,
            title: mpItem.title ?? match.title,
            summary: mpItem.summary ?? match.summary,
            instructions: mpItem.instructions,
            difficulty: mpItem.difficulty ?? match.difficulty,
            estimatedMinutes:
              mpItem.estimatedMinutes ?? match.estimatedMinutes,
            tags: mpItem.tags ?? match.tags,
            order: mpItem.order,
            driveFileId: mpItem.driveFileId,
            driveModifiedTime: mpItem.driveModifiedTime,
            driveMd5Checksum: mpItem.driveMd5Checksum,
            driveSourcePath: mpItem.driveSourcePath,
            updatedAt: now,
          })
          .where(eq(miniProjects.id, match.id));
        summary.miniProjectsUpdated += 1;
      } else {
        await tx.insert(miniProjects).values({
          dayId: targetDay.id,
          title:
            mpItem.title ??
            defaults?.title ??
            `Day ${mpItem.dayNumber} Mini-Project`,
          summary: mpItem.summary ?? defaults?.summary ?? null,
          instructions: mpItem.instructions,
          milestones: defaults?.milestones ?? [],
          difficulty: mpItem.difficulty ?? defaults?.difficulty ?? "INTERMEDIATE",
          estimatedMinutes:
            mpItem.estimatedMinutes ?? defaults?.estimatedMinutes ?? 90,
          tags: mpItem.tags ?? defaults?.tags ?? [],
          dueDate: defaults?.dueDate ?? null,
          order: mpItem.order,
          publishedAt: targetDay.publishedAt ?? schedule.publishedAt,
          driveFileId: mpItem.driveFileId,
          driveModifiedTime: mpItem.driveModifiedTime,
          driveMd5Checksum: mpItem.driveMd5Checksum,
          driveSourcePath: mpItem.driveSourcePath,
        });
        summary.miniProjectsCreated += 1;
      }
    }
  });

  // 6. Report orphaned Drive-tracked rows as warnings (non-destructive)
  for (const res of existingResources) {
    if (res.driveFileId && !activeDriveIds.has(res.driveFileId)) {
      summary.warnings.push(
        `Drive file missing or archived for resource "${res.title}" (${res.driveSourcePath ?? res.driveFileId}) — kept in database.`
      );
    }
  }
  for (const mp of existingMiniProjects) {
    if (mp.driveFileId && !activeDriveIds.has(mp.driveFileId)) {
      summary.warnings.push(
        `Drive file missing or archived for mini-project "${mp.title}" (${mp.driveSourcePath ?? mp.driveFileId}) — kept in database.`
      );
    }
  }

  summary.durationMs = Date.now() - startedAt;
  return summary;
}

export async function syncFromDrive(
  options: DriveSyncOptions = {}
): Promise<DriveSyncResult> {
  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = executeDriveSync(options).finally(() => {
    inFlightSync = null;
  });

  return inFlightSync;
}
