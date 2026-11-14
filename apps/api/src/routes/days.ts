import { Router } from "express";
import { asc, eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { days, resources } from "../db/schema.js";

export const daysRouter = Router();

daysRouter.get("/", async (_req, res, next) => {
  try {
    const publishedDays = await db.query.days.findMany({
      where: eq(days.isPublished, true),
      orderBy: [asc(days.dayNumber)],
      with: {
        resources: {
          where: eq(resources.isPublished, true),
          orderBy: [asc(resources.order), asc(resources.createdAt)],
        },
      },
    });

    res.json(publishedDays);
  } catch (err) {
    next(err);
  }
});

daysRouter.get("/:id", async (req, res, next) => {
  try {
    const day = await db.query.days.findFirst({
      where: and(eq(days.id, req.params.id), eq(days.isPublished, true)),
      with: {
        resources: {
          where: eq(resources.isPublished, true),
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
