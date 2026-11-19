import { Router } from "express";
import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { miniProjects } from "../db/schema.js";
import { isDayUnlockedForRequest } from "../lib/dayPassword.js";

export const miniProjectsRouter = Router();

miniProjectsRouter.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const dayIdParam =
      typeof req.query.dayId === "string" && req.query.dayId.trim()
        ? req.query.dayId.trim()
        : null;
    const dayNumRaw =
      typeof req.query.day === "string" ? Number(req.query.day) : NaN;
    const dayNumberParam =
      Number.isInteger(dayNumRaw) && dayNumRaw > 0 ? dayNumRaw : null;

    const conditions = [
      isNotNull(miniProjects.publishedAt),
      lte(miniProjects.publishedAt, now),
    ];
    if (dayIdParam) {
      conditions.push(eq(miniProjects.dayId, dayIdParam));
    }

    const rows = await db.query.miniProjects.findMany({
      where: and(...conditions),
      orderBy: [asc(miniProjects.order), asc(miniProjects.createdAt)],
      with: {
        day: {
          columns: {
            id: true,
            dayNumber: true,
            title: true,
            publishedAt: true,
            passwordHash: true,
          },
        },
      },
    });

    const visible = rows
      .filter((row) => {
        if (dayNumberParam !== null) {
          if (!row.day || row.day.dayNumber !== dayNumberParam) return false;
        }
        if (row.day) {
          if (!row.day.publishedAt || row.day.publishedAt > now) return false;
          if (
            !isDayUnlockedForRequest(req, {
              id: row.day.id,
              passwordHash: row.day.passwordHash,
            })
          ) {
            return false;
          }
        }
        return true;
      })
      .map(({ day, ...project }) => ({
        ...project,
        day:
          day && day.publishedAt && day.publishedAt <= now
            ? { id: day.id, dayNumber: day.dayNumber, title: day.title }
            : null,
      }));

    res.json(visible);
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
            passwordHash: true,
          },
        },
      },
    });

    if (!row) {
      res.status(404).json({ error: "Mini project not found" });
      return;
    }

    if (
      row.day &&
      (!row.day.publishedAt ||
        row.day.publishedAt > now ||
        !isDayUnlockedForRequest(req, {
          id: row.day.id,
          passwordHash: row.day.passwordHash,
        }))
    ) {
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
