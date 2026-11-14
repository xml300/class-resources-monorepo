import { Router } from "express";
import jwt from "jsonwebtoken";
import { loginSchema } from "@repo/shared";
import { env } from "../env.js";
import {
  ADMIN_COOKIE_NAME,
  extractToken,
  verifyAdminToken,
} from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid login payload",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = parsed.data;
  if (email !== env.ADMIN_EMAIL || password !== env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ email, role: "admin" }, env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ authenticated: true, email });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
  res.json({ authenticated: false });
});

authRouter.get("/me", (req, res) => {
  const token = extractToken(req);
  if (!token) {
    res.json({ authenticated: false, email: null });
    return;
  }

  const admin = verifyAdminToken(token);
  if (!admin) {
    res.json({ authenticated: false, email: null });
    return;
  }

  res.json({ authenticated: true, email: admin.email });
});
