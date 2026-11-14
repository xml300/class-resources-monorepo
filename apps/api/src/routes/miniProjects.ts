import { Router } from "express";
import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { miniProjects } from "../db/schema.js";

export const miniProjectsRouter = Router();

miniProjectsRouter.get("/", async (_req, res, next) => {
  try {
    const now = new Date();
    const rows = await db.query.miniProjects.findMany({
      where: and(
        isNotNull(miniProjects.publishedAt),
        lte(miniProjects.publishedAt, now)
      ),
      orderBy: [asc(miniProjects.order), asc(miniProjects.createdAt)],
      with: {
        day: {
          columns: {
            id: true,
            dayNumber: true,
            title: true,
            publishedAt: true,
          },
        },
      },
    });

    const sanitized = rows.map(({ day, ...project }) => ({
      ...project,
      day:
        day && day.publishedAt && day.publishedAt <= now
          ? { id: day.id, dayNumber: day.dayNumber, title: day.title }
          : null,
    }));

    res.json(sanitized);
  } catch (err) {
    next(err);
  }
});

miniProjectsRouter.get("/:id", async (req, res, next) => {
  try {
    const now = new Date();
    const row = await db.query.miniProjects.findFirst({
      where: and(
        eq(miniProjects.id, req.params.id),
        isNotNull(miniProjects.publishedAt),
        lte(miniProjects.publishedAt, now)
      ),
      with: {
        day: {
          columns: {
            id: true,
            dayNumber: true,
            title: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!row) {
      res.status(404).json({ error: "Mini project not found" });
      return;
    }

    const { day, ...project } = row;
    res.json({
      ...project,
      day:
        day && day.publishedAt && day.publishedAt <= now
          ? { id: day.id, dayNumber: day.dayNumber, title: day.title }
          : null,
    });
  } catch (err) {
    next(err);
  }
});
