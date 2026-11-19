import { Router } from "express";
import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { resources } from "../db/schema.js";
import { isDayUnlockedForRequest } from "../lib/dayPassword.js";

export const exercisesRouter = Router();

exercisesRouter.get("/", async (req, res, next) => {
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
      eq(resources.type, "ASSIGNMENT"),
      isNotNull(resources.publishedAt),
      lte(resources.publishedAt, now),
    ];
    if (dayIdParam) {
      conditions.push(eq(resources.dayId, dayIdParam));
    }

    const rows = await db.query.resources.findMany({
      where: and(...conditions),
      orderBy: [asc(resources.order), asc(resources.createdAt)],
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
      .filter(
        (row) =>
          row.day &&
          row.day.publishedAt &&
          row.day.publishedAt <= now &&
          (dayNumberParam === null || row.day.dayNumber === dayNumberParam) &&
          isDayUnlockedForRequest(req, {
            id: row.day.id,
            passwordHash: row.day.passwordHash,
          })
      )
      .sort((a, b) => {
        if (a.day.dayNumber !== b.day.dayNumber) {
          return a.day.dayNumber - b.day.dayNumber;
        }
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .map(({ day, ...resource }) => ({
        ...resource,
        day: {
          id: day.id,
          dayNumber: day.dayNumber,
          title: day.title,
        },
      }));

    res.json(visible);
  } catch (err) {
    next(err);
  }
});

exercisesRouter.get("/:id", async (req, res, next) => {
  try {
    const now = new Date();
    const row = await db.query.resources.findFirst({
      where: and(
        eq(resources.id, req.params.id),
        eq(resources.type, "ASSIGNMENT"),
        isNotNull(resources.publishedAt),
        lte(resources.publishedAt, now)
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

    if (
      !row ||
      !row.day ||
      !row.day.publishedAt ||
      row.day.publishedAt > now ||
      !isDayUnlockedForRequest(req, {
        id: row.day.id,
        passwordHash: row.day.passwordHash,
      })
    ) {
      res.status(404).json({ error: "Coding exercise not found" });
      return;
    }

    const { day, ...resource } = row;
    res.json({
      ...resource,
      day: {
        id: day.id,
        dayNumber: day.dayNumber,
        title: day.title,
      },
    });
  } catch (err) {
    next(err);
  }
});
