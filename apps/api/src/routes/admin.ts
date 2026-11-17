import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import {
  createDaySchema,
  updateDaySchema,
  createResourceSchema,
  updateResourceSchema,
  createMiniProjectSchema,
  updateMiniProjectSchema,
} from "@repo/shared";
import { db } from "../db/index.js";
import { days, resources, miniProjects } from "../db/schema.js";
import { requireAdmin } from "../middleware/auth.js";
import { hashDayPassword } from "../lib/dayPassword.js";
import { syncSeedMaterials } from "../db/syncMaterials.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

function serializeAdminDay<T extends { passwordHash: string | null }>(day: T) {
  const { passwordHash, ...rest } = day;
  return {
    ...rest,
    hasPassword: Boolean(passwordHash),
    isLocked: false,
  };
}

// List all days (including drafts) with all resources
adminRouter.get("/days", async (_req, res, next) => {
  try {
    const allDays = await db.query.days.findMany({
      orderBy: [asc(days.dayNumber)],
      with: {
        resources: {
          orderBy: [asc(resources.order), asc(resources.createdAt)],
        },
      },
    });
    res.json(allDays.map(serializeAdminDay));
  } catch (err) {
    next(err);
  }
});

// Get single day (including drafts) with all resources
adminRouter.get("/days/:id", async (req, res, next) => {
  try {
    const day = await db.query.days.findFirst({
      where: eq(days.id, req.params.id),
      with: {
        resources: {
          orderBy: [asc(resources.order), asc(resources.createdAt)],
        },
      },
    });
    if (!day) {
      res.status(404).json({ error: "Day not found" });
      return;
    }
    res.json(serializeAdminDay(day));
  } catch (err) {
    next(err);
  }
});

// Create a day
adminRouter.post("/days", async (req, res, next) => {
  try {
    const parsed = createDaySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { dayNumber, title, date, summary, publishedAt, password } =
      parsed.data;
    const passwordHash =
      password && password.trim().length > 0
        ? hashDayPassword(password.trim())
        : null;

    const [created] = await db
      .insert(days)
      .values({
        dayNumber,
        title,
        date: date ? new Date(date) : null,
        summary: summary ?? null,
        passwordHash,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      })
      .returning();

    res.status(201).json({ ...serializeAdminDay(created), resources: [] });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      res
        .status(409)
        .json({ error: "A day with this day number already exists" });
      return;
    }
    next(err);
  }
});

// Update a day
adminRouter.patch("/days/:id", async (req, res, next) => {
  try {
    const parsed = updateDaySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const existing = await db.query.days.findFirst({
      where: eq(days.id, req.params.id),
    });

    if (!existing) {
      res.status(404).json({ error: "Day not found" });
      return;
    }

    const now = new Date();
    const updates: Record<string, unknown> = {
      updatedAt: now,
    };
    if (parsed.data.dayNumber !== undefined)
      updates.dayNumber = parsed.data.dayNumber;
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.date !== undefined)
      updates.date = parsed.data.date ? new Date(parsed.data.date) : null;
    if (parsed.data.summary !== undefined)
      updates.summary = parsed.data.summary ?? null;

    const nextPublishedAt =
      parsed.data.publishedAt !== undefined
        ? parsed.data.publishedAt
          ? new Date(parsed.data.publishedAt)
          : null
        : undefined;
    if (nextPublishedAt !== undefined) {
      updates.publishedAt = nextPublishedAt;
    }

    if (parsed.data.password !== undefined) {
      if (parsed.data.password && parsed.data.password.trim().length > 0) {
        updates.passwordHash = hashDayPassword(parsed.data.password.trim());
      } else {
        updates.passwordHash = null;
      }
    }

    const updated = await db.transaction(async (tx) => {
      const [updatedDay] = await tx
        .update(days)
        .set(updates)
        .where(eq(days.id, req.params.id))
        .returning();

      if (
        nextPublishedAt !== undefined &&
        nextPublishedAt !== null &&
        (existing.publishedAt?.getTime() ?? null) !== nextPublishedAt.getTime()
      ) {
        const wasScheduled =
          existing.publishedAt !== null && existing.publishedAt > now;
        const isPublishingNow = nextPublishedAt <= now;

        const resourceCondition =
          wasScheduled && isPublishingNow
            ? or(isNull(resources.publishedAt), gt(resources.publishedAt, now))
            : isNull(resources.publishedAt);

        await tx
          .update(resources)
          .set({
            publishedAt: nextPublishedAt,
            updatedAt: now,
          })
          .where(and(eq(resources.dayId, updatedDay.id), resourceCondition));
      }

      return updatedDay;
    });

    res.json(serializeAdminDay(updated));
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      res
        .status(409)
        .json({ error: "A day with this day number already exists" });
      return;
    }
    next(err);
  }
});

// Delete a day
adminRouter.delete("/days/:id", async (req, res, next) => {
  try {
    const [deleted] = await db
      .delete(days)
      .where(eq(days.id, req.params.id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Day not found" });
      return;
    }

    res.json({ deleted: true, id: deleted.id });
  } catch (err) {
    next(err);
  }
});

// Create a resource under a day
adminRouter.post("/days/:dayId/resources", async (req, res, next) => {
  try {
    const parsed = createResourceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const existingDay = await db.query.days.findFirst({
      where: eq(days.id, req.params.dayId),
    });
    if (!existingDay) {
      res.status(404).json({ error: "Day not found" });
      return;
    }

    const { title, description, type, url, content, order, publishedAt } =
      parsed.data;
    const [created] = await db
      .insert(resources)
      .values({
        dayId: req.params.dayId,
        title,
        description: description ?? null,
        type,
        url: url ?? null,
        content: content ?? null,
        order,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// Update a resource
adminRouter.patch("/resources/:id", async (req, res, next) => {
  try {
    const parsed = updateResourceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const existing = await db.query.resources.findFirst({
      where: eq(resources.id, req.params.id),
    });
    if (!existing) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    const nextUrl =
      parsed.data.url !== undefined ? (parsed.data.url ?? null) : existing.url;
    const nextContent =
      parsed.data.content !== undefined
        ? (parsed.data.content ?? null)
        : existing.content;

    if (!nextUrl && !nextContent) {
      res.status(400).json({
        error: "URL, uploaded file, or pasted code is required",
      });
      return;
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description ?? null;
    if (parsed.data.type !== undefined) updates.type = parsed.data.type;
    if (parsed.data.url !== undefined) updates.url = parsed.data.url ?? null;
    if (parsed.data.content !== undefined)
      updates.content = parsed.data.content ?? null;
    if (parsed.data.order !== undefined) updates.order = parsed.data.order;
    if (parsed.data.publishedAt !== undefined)
      updates.publishedAt = parsed.data.publishedAt
        ? new Date(parsed.data.publishedAt)
        : null;

    const [updated] = await db
      .update(resources)
      .set(updates)
      .where(eq(resources.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete a resource
adminRouter.delete("/resources/:id", async (req, res, next) => {
  try {
    const [deleted] = await db
      .delete(resources)
      .where(eq(resources.id, req.params.id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

    res.json({ deleted: true, id: deleted.id });
  } catch (err) {
    next(err);
  }
});

// List all mini projects (including drafts and scheduled)
adminRouter.get("/mini-projects", async (_req, res, next) => {
  try {
    const rows = await db.query.miniProjects.findMany({
      orderBy: [asc(miniProjects.order), asc(miniProjects.createdAt)],
      with: {
        day: {
          columns: {
            id: true,
            dayNumber: true,
            title: true,
          },
        },
      },
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Get single mini project
adminRouter.get("/mini-projects/:id", async (req, res, next) => {
  try {
    const row = await db.query.miniProjects.findFirst({
      where: eq(miniProjects.id, req.params.id),
      with: {
        day: {
          columns: {
            id: true,
            dayNumber: true,
            title: true,
          },
        },
      },
    });
    if (!row) {
      res.status(404).json({ error: "Mini project not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
});

// Create a mini project
adminRouter.post("/mini-projects", async (req, res, next) => {
  try {
    const parsed = createMiniProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const d = parsed.data;
    const [created] = await db
      .insert(miniProjects)
      .values({
        title: d.title,
        summary: d.summary ?? null,
        instructions: d.instructions ?? null,
        milestones: d.milestones ?? [],
        starterRepoUrl: d.starterRepoUrl || null,
        demoUrl: d.demoUrl || null,
        specUrl: d.specUrl || null,
        solutionUrl: d.solutionUrl || null,
        attachmentUrl: d.attachmentUrl || null,
        dayId: d.dayId ?? null,
        difficulty: d.difficulty,
        estimatedMinutes: d.estimatedMinutes ?? null,
        tags: d.tags ?? [],
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        order: d.order,
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
      })
      .returning();

    const withDay = await db.query.miniProjects.findFirst({
      where: eq(miniProjects.id, created.id),
      with: {
        day: {
          columns: { id: true, dayNumber: true, title: true },
        },
      },
    });

    res.status(201).json(withDay);
  } catch (err) {
    next(err);
  }
});

// Update a mini project
adminRouter.patch("/mini-projects/:id", async (req, res, next) => {
  try {
    const parsed = updateMiniProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const d = parsed.data;
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (d.title !== undefined) updates.title = d.title;
    if (d.summary !== undefined) updates.summary = d.summary ?? null;
    if (d.instructions !== undefined)
      updates.instructions = d.instructions ?? null;
    if (d.milestones !== undefined) updates.milestones = d.milestones;
    if (d.starterRepoUrl !== undefined)
      updates.starterRepoUrl = d.starterRepoUrl || null;
    if (d.demoUrl !== undefined) updates.demoUrl = d.demoUrl || null;
    if (d.specUrl !== undefined) updates.specUrl = d.specUrl || null;
    if (d.solutionUrl !== undefined)
      updates.solutionUrl = d.solutionUrl || null;
    if (d.attachmentUrl !== undefined)
      updates.attachmentUrl = d.attachmentUrl || null;
    if (d.dayId !== undefined) updates.dayId = d.dayId ?? null;
    if (d.difficulty !== undefined) updates.difficulty = d.difficulty;
    if (d.estimatedMinutes !== undefined)
      updates.estimatedMinutes = d.estimatedMinutes ?? null;
    if (d.tags !== undefined) updates.tags = d.tags;
    if (d.dueDate !== undefined)
      updates.dueDate = d.dueDate ? new Date(d.dueDate) : null;
    if (d.order !== undefined) updates.order = d.order;
    if (d.publishedAt !== undefined)
      updates.publishedAt = d.publishedAt ? new Date(d.publishedAt) : null;

    const [updated] = await db
      .update(miniProjects)
      .set(updates)
      .where(eq(miniProjects.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Mini project not found" });
      return;
    }

    const withDay = await db.query.miniProjects.findFirst({
      where: eq(miniProjects.id, updated.id),
      with: {
        day: {
          columns: { id: true, dayNumber: true, title: true },
        },
      },
    });

    res.json(withDay);
  } catch (err) {
    next(err);
  }
});

// Delete a mini project
adminRouter.delete("/mini-projects/:id", async (req, res, next) => {
  try {
    const [deleted] = await db
      .delete(miniProjects)
      .where(eq(miniProjects.id, req.params.id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Mini project not found" });
      return;
    }

    res.json({ deleted: true, id: deleted.id });
  } catch (err) {
    next(err);
  }
});

// Upload a file resource
adminRouter.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.originalname,
    size: req.file.size,
  });
});

// Sync bundled course materials into the database without overwriting passwords or publish state
adminRouter.post("/sync-materials", async (_req, res, next) => {
  try {
    const result = await syncSeedMaterials();
    res.json(result);
  } catch (err) {
    next(err);
  }
});
