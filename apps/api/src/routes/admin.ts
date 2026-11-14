import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { asc, eq } from "drizzle-orm";
import {
  createDaySchema,
  updateDaySchema,
  createResourceSchema,
  updateResourceSchema,
} from "@repo/shared";
import { db } from "../db/index.js";
import { days, resources } from "../db/schema.js";
import { requireAdmin } from "../middleware/auth.js";

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
    res.json(allDays);
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
    res.json(day);
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

    const { dayNumber, title, date, summary, isPublished } = parsed.data;
    const [created] = await db
      .insert(days)
      .values({
        dayNumber,
        title,
        date: date ? new Date(date) : null,
        summary: summary ?? null,
        isPublished,
      })
      .returning();

    res.status(201).json({ ...created, resources: [] });
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

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (parsed.data.dayNumber !== undefined)
      updates.dayNumber = parsed.data.dayNumber;
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.date !== undefined)
      updates.date = parsed.data.date ? new Date(parsed.data.date) : null;
    if (parsed.data.summary !== undefined)
      updates.summary = parsed.data.summary ?? null;
    if (parsed.data.isPublished !== undefined)
      updates.isPublished = parsed.data.isPublished;

    const [updated] = await db
      .update(days)
      .set(updates)
      .where(eq(days.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Day not found" });
      return;
    }

    res.json(updated);
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

    const { title, description, type, url, order, isPublished } = parsed.data;
    const [created] = await db
      .insert(resources)
      .values({
        dayId: req.params.dayId,
        title,
        description: description ?? null,
        type,
        url,
        order,
        isPublished,
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

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description ?? null;
    if (parsed.data.type !== undefined) updates.type = parsed.data.type;
    if (parsed.data.url !== undefined) updates.url = parsed.data.url;
    if (parsed.data.order !== undefined) updates.order = parsed.data.order;
    if (parsed.data.isPublished !== undefined)
      updates.isPublished = parsed.data.isPublished;

    const [updated] = await db
      .update(resources)
      .set(updates)
      .where(eq(resources.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Resource not found" });
      return;
    }

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
