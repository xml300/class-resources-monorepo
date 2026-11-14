import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface AdminPayload {
  email: string;
  role: "admin";
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminPayload;
}

export const ADMIN_COOKIE_NAME = "admin_token";

export function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[ADMIN_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AdminPayload;
    if (decoded && decoded.role === "admin") {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const admin = verifyAdminToken(token);
  if (!admin) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  req.admin = admin;
  next();
}
