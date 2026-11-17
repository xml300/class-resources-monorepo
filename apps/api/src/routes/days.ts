import { Router, type Request } from "express";
import { asc, eq, and, isNotNull, lte } from "drizzle-orm";
import { unlockDaySchema } from "@repo/shared";
import { db } from "../db/index.js";
import { days, resources, dayUnlockAttempts } from "../db/schema.js";
import {
  getClientIp,
  getPasswordFingerprint,
  isDayUnlockedForRequest,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  readUnlockedDaysCookie,
  verifyDayPassword,
  writeUnlockedDaysCookie,
} from "../lib/dayPassword.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { resolveResourceContent } from "../lib/materialsSync.js";

export const daysRouter = Router();

const unlockRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: "day-unlock",
  message:
    "Too many unlock requests from your device. Please wait a minute and try again.",
});

interface PublicResourceRow {
  title: string;
  content: string | null;
  updatedAt?: Date | string | null;
}

function serializePublicDay<
  T extends {
    id: string;
    passwordHash: string | null;
    summary: string | null;
    resources: PublicResourceRow[];
  },
>(req: Request, day: T) {
  const { passwordHash, ...rest } = day;
  const hasPassword = Boolean(passwordHash);
  const unlocked = isDayUnlockedForRequest(req, { id: day.id, passwordHash });

  if (!unlocked) {
    return {
      ...rest,
      summary: null,
      resources: [],
      hasPassword,
      isLocked: true,
    };
  }

  return {
    ...rest,
    resources: rest.resources.map((res) => ({
      ...res,
      content: resolveResourceContent(res),
    })),
    hasPassword,
    isLocked: false,
  };
}

daysRouter.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const publishedDays = await db.query.days.findMany({
      where: and(isNotNull(days.publishedAt), lte(days.publishedAt, now)),
      orderBy: [asc(days.dayNumber)],
      with: {
        resources: {
          where: and(
            isNotNull(resources.publishedAt),
            lte(resources.publishedAt, now)
          ),
          orderBy: [asc(resources.order), asc(resources.createdAt)],
        },
      },
    });

    res.json(publishedDays.map((day) => serializePublicDay(req, day)));
  } catch (err) {
    next(err);
  }
});

daysRouter.get("/:id", async (req, res, next) => {
  try {
    const now = new Date();
    const day = await db.query.days.findFirst({
      where: and(
        eq(days.id, req.params.id),
        isNotNull(days.publishedAt),
        lte(days.publishedAt, now)
      ),
      with: {
        resources: {
          where: and(
            isNotNull(resources.publishedAt),
            lte(resources.publishedAt, now)
          ),
          orderBy: [asc(resources.order), asc(resources.createdAt)],
        },
      },
    });

    if (!day) {
      res.status(404).json({ error: "Day not found" });
      return;
    }

    res.json(serializePublicDay(req, day));
  } catch (err) {
    next(err);
  }
});

daysRouter.post("/:id/unlock", unlockRateLimiter, async (req, res, next) => {
  try {
    const parsed = unlockDaySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Password is required",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const now = new Date();
    const day = await db.query.days.findFirst({
      where: and(
        eq(days.id, req.params.id),
        isNotNull(days.publishedAt),
        lte(days.publishedAt, now)
      ),
    });

    if (!day) {
      res.status(404).json({ error: "Day not found" });
      return;
    }

    if (!day.passwordHash) {
      res.json({ unlocked: true, dayId: day.id });
      return;
    }

    const ipAddress = getClientIp(req);
    const existingAttempt = await db.query.dayUnlockAttempts.findFirst({
      where: and(
        eq(dayUnlockAttempts.dayId, day.id),
        eq(dayUnlockAttempts.ipAddress, ipAddress)
      ),
    });

    if (existingAttempt?.lockedUntil && existingAttempt.lockedUntil > now) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existingAttempt.lockedUntil.getTime() - now.getTime()) / 1000)
      );
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(423).json({
        error:
          "Too many unsuccessful password attempts. Access is temporarily locked.",
        retryAfterSeconds,
        lockedUntil: existingAttempt.lockedUntil.toISOString(),
        remainingAttempts: 0,
      });
      return;
    }

    const isValid = verifyDayPassword(parsed.data.password, day.passwordHash);

    if (!isValid) {
      const wasPreviouslyLocked =
        existingAttempt?.lockedUntil && existingAttempt.lockedUntil <= now;
      const nextFailedAttempts = wasPreviouslyLocked
        ? 1
        : (existingAttempt?.failedAttempts ?? 0) + 1;
      const shouldLock = nextFailedAttempts >= MAX_FAILED_ATTEMPTS;
      const nextLockedUntil = shouldLock
        ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
        : null;

      if (existingAttempt) {
        await db
          .update(dayUnlockAttempts)
          .set({
            failedAttempts: nextFailedAttempts,
            lockedUntil: nextLockedUntil,
            lastAttemptAt: now,
            updatedAt: now,
          })
          .where(eq(dayUnlockAttempts.id, existingAttempt.id));
      } else {
        await db.insert(dayUnlockAttempts).values({
          dayId: day.id,
          ipAddress,
          failedAttempts: nextFailedAttempts,
          lockedUntil: nextLockedUntil,
          lastAttemptAt: now,
        });
      }

      if (shouldLock && nextLockedUntil) {
        const retryAfterSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.status(423).json({
          error:
            "Too many unsuccessful password attempts. Access is temporarily locked.",
          retryAfterSeconds,
          lockedUntil: nextLockedUntil.toISOString(),
          remainingAttempts: 0,
        });
        return;
      }

      res.status(401).json({
        error: "Incorrect password",
        remainingAttempts: MAX_FAILED_ATTEMPTS - nextFailedAttempts,
      });
      return;
    }

    // Password is valid: reset failed attempts & preserve unlock token on device
    if (existingAttempt) {
      await db
        .update(dayUnlockAttempts)
        .set({
          failedAttempts: 0,
          lockedUntil: null,
          lastAttemptAt: now,
          updatedAt: now,
        })
        .where(eq(dayUnlockAttempts.id, existingAttempt.id));
    }

    const unlockedMap = readUnlockedDaysCookie(req);
    unlockedMap[day.id] = getPasswordFingerprint(day.passwordHash);
    writeUnlockedDaysCookie(res, unlockedMap);

    res.json({ unlocked: true, dayId: day.id });
  } catch (err) {
    next(err);
  }
});


