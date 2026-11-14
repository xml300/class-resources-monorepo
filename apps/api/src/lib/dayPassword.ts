import crypto from "node:crypto";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

export const DAY_UNLOCK_COOKIE_NAME = "day_unlocks";
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface UnlockCookiePayload {
  unlockedDays: Record<string, string>;
}

export function hashDayPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyDayPassword(
  password: string,
  storedHash: string
): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const expectedBuf = Buffer.from(expectedHex, "hex");
  const actualBuf = crypto.scryptSync(password, salt, 64);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function getPasswordFingerprint(storedHash: string): string {
  return crypto
    .createHash("sha256")
    .update(storedHash)
    .digest("hex")
    .slice(0, 16);
}

export function readUnlockedDaysCookie(req: Request): Record<string, string> {
  const token = req.cookies?.[DAY_UNLOCK_COOKIE_NAME] as string | undefined;
  if (!token) return {};
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UnlockCookiePayload;
    if (
      decoded &&
      typeof decoded.unlockedDays === "object" &&
      decoded.unlockedDays !== null
    ) {
      return decoded.unlockedDays;
    }
    return {};
  } catch {
    return {};
  }
}

export function writeUnlockedDaysCookie(
  res: Response,
  unlockedDays: Record<string, string>
): void {
  const token = jwt.sign({ unlockedDays }, env.JWT_SECRET, {
    expiresIn: "30d",
  });
  res.cookie(DAY_UNLOCK_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function isDayUnlockedForRequest(
  req: Request,
  day: { id: string; passwordHash: string | null }
): boolean {
  if (!day.passwordHash) return true;
  const unlockedMap = readUnlockedDaysCookie(req);
  return unlockedMap[day.id] === getPasswordFingerprint(day.passwordHash);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}
