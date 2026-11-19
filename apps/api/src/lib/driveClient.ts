export const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
export const GOOGLE_SLIDES_MIME = "application/vnd.google-apps.presentation";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const REQUEST_TIMEOUT_MS = 15_000;

export interface DriveFileEntry {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  md5Checksum: string | null;
  webViewLink: string | null;
  sourcePath: string;
  folderName: string | null;
}

interface DriveListResponse {
  files?: Array<{
    id?: string;
    name?: string;
    mimeType?: string;
    modifiedTime?: string;
    md5Checksum?: string;
    webViewLink?: string;
  }>;
  nextPageToken?: string;
  error?: {
    code?: number;
    message?: string;
  };
}

export function extractGoogleDriveIdFromUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (
      !parsed.hostname.endsWith("drive.google.com") &&
      !parsed.hostname.endsWith("docs.google.com")
    ) {
      return null;
    }

    const pathMatch =
      /\/(?:file|presentation|document|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/.exec(
        parsed.pathname
      );
    if (pathMatch) return pathMatch[1];

    const idParam = parsed.searchParams.get("id");
    if (idParam && /^[a-zA-Z0-9_-]+$/.test(idParam)) return idParam;

    return null;
  } catch {
    return null;
  }
}

export function buildDriveViewUrl(file: Pick<DriveFileEntry, "id" | "mimeType" | "webViewLink">): string {
  if (file.mimeType === GOOGLE_SLIDES_MIME) {
    return `https://docs.google.com/presentation/d/${encodeURIComponent(file.id)}`;
  }
  if (file.webViewLink) {
    return file.webViewLink;
  }
  return `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`;
}

export function isMarkdownFile(file: Pick<DriveFileEntry, "name" | "mimeType">): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".markdown") ||
    file.mimeType === "text/markdown"
  );
}

function shouldSkipFolder(folderName: string): boolean {
  const normalized = folderName.trim().toLowerCase();
  return (
    normalized === "archive" ||
    normalized === "_archive" ||
    normalized.startsWith("_") ||
    normalized.startsWith(".")
  );
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "Cache-Control": "no-cache" },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function listDirectChildren(
  folderId: string,
  apiKey: string
): Promise<NonNullable<DriveListResponse["files"]>> {
  const items: NonNullable<DriveListResponse["files"]> = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken,files(id,name,mimeType,modifiedTime,md5Checksum,webViewLink)",
      pageSize: "100",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
      key: apiKey,
    });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const res = await fetchWithTimeout(
      `${DRIVE_API_BASE}/files?${params.toString()}`
    );
    const body = (await res.json().catch(() => ({}))) as DriveListResponse;

    if (!res.ok) {
      const detail = body.error?.message || `HTTP ${res.status}`;
      throw new Error(`Google Drive API files.list failed: ${detail}`);
    }

    if (body.files) {
      items.push(...body.files);
    }
    pageToken = body.nextPageToken;
  } while (pageToken);

  return items;
}

export async function listDriveFolderTree(
  rootFolderId: string,
  apiKey: string
): Promise<DriveFileEntry[]> {
  const results: DriveFileEntry[] = [];

  async function walk(
    folderId: string,
    prefix: string,
    topFolderName: string | null
  ): Promise<void> {
    const children = await listDirectChildren(folderId, apiKey);

    for (const child of children) {
      if (!child.id || !child.name || !child.mimeType) continue;

      if (child.mimeType === DRIVE_FOLDER_MIME) {
        if (shouldSkipFolder(child.name)) continue;
        const nextPrefix = prefix ? `${prefix}/${child.name}` : child.name;
        await walk(child.id, nextPrefix, topFolderName ?? child.name);
        continue;
      }

      results.push({
        id: child.id,
        name: child.name,
        mimeType: child.mimeType,
        modifiedTime: child.modifiedTime ?? null,
        md5Checksum: child.md5Checksum ?? null,
        webViewLink: child.webViewLink ?? null,
        sourcePath: prefix ? `${prefix}/${child.name}` : child.name,
        folderName: topFolderName,
      });
    }
  }

  await walk(rootFolderId, "", null);
  results.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  return results;
}

export async function downloadDriveFileText(
  fileId: string,
  apiKey: string
): Promise<string> {
  const params = new URLSearchParams({
    alt: "media",
    supportsAllDrives: "true",
    key: apiKey,
  });

  const res = await fetchWithTimeout(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`
  );

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      if (errBody.error?.message) {
        detail = errBody.error.message;
      }
    } catch {
      // ignore non-JSON error body
    }
    throw new Error(`Google Drive download failed for ${fileId}: ${detail}`);
  }

  const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
  if (contentType.includes("text/html")) {
    throw new Error(
      `Google Drive returned HTML instead of file content for ${fileId} (check public sharing permissions)`
    );
  }

  const text = await res.text();
  const trimmed = text.trimStart().toLowerCase();
  if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")) {
    throw new Error(
      `Google Drive returned HTML instead of file content for ${fileId} (check public sharing permissions)`
    );
  }

  return text;
}
