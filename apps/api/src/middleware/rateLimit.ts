import type { NextFunction, Request, Response } from "express";
import { getClientIp } from "../lib/dayPassword.js";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  message?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter({
  windowMs,
  max,
  keyPrefix = "rl",
  message = "Too many requests. Please slow down and try again shortly.",
}: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  // Periodic cleanup to avoid unbounded memory growth
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, Math.max(windowMs, 60_000));
  cleanupTimer.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = getClientIp(req);
    const key = `${keyPrefix}:${ip}`;

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000)
    );

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: message,
        retryAfterSeconds,
      });
      return;
    }

    next();
  };
}
