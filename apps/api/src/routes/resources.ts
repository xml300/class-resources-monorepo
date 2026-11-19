import { Router } from "express";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { resources } from "../db/schema.js";
import { isDayUnlockedForRequest } from "../lib/dayPassword.js";

export const resourcesRouter = Router();

resourcesRouter.get("/:id", async (req, res, next) => {
  try {
    const now = new Date();
    const row = await db.query.resources.findFirst({
      where: and(
        eq(resources.id, req.params.id),
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
      res.status(404).json({ error: "Resource not found" });
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
