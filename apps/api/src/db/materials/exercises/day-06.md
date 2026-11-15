# Day 6: Authentication, Authorization & API Security

## Coding Exercises

### Exercise 6.1 — Password Hashing
Implement `hashPassword(plain)` and `verifyPassword(hash, plain)` using `argon2`, and verify that two hashes of the same password produce different outputs (salting).

### Exercise 6.2 — JWT Sign & Verify Helpers
Implement `signToken({ sub, role })` with `expiresIn: "1h"` and `verifyToken(token)` using `env.JWT_SECRET`, throwing a `401` `AppError` on expired or tampered tokens.

### Exercise 6.3 — `req.user` Declaration Merging & `requireAuth`
Create `src/types/express.d.ts` to type `req.user`, then write a `requireAuth` middleware that extracts the `Authorization: Bearer <token>` header and attaches `req.user`.

### Exercise 6.4 — Role-Based Access Control
Write a `requireRole(...roles)` middleware factory that returns `403 Forbidden` if `req.user?.role` is not in the allowed list.

### Exercise 6.5 — Security Headers, CORS & Rate Limiting
Configure `helmet()`, strict `cors({ origin: env.CORS_ORIGIN })`, and `express-rate-limit` (for example, max 10 requests per 15 minutes) on `/auth/login`.

---

## Mini-Project: Auth & RBAC Middleware Sandbox

Build a standalone authentication and role-based access control API.

### Core (Required)
* Implement `POST /auth/register`, `POST /auth/login`, `GET /me` (authenticated), and `DELETE /admin/users/:id` (admin-only).
* Ensure password hashes are never returned in API responses.
* Return `401` for missing/invalid tokens and `403` when a user lacks the required role.

### Stretch
* Add `helmet()`, strict `cors({ origin })`, and `express-rate-limit` on `POST /auth/login`.

### Challenge
* Add an ownership check middleware (`requireOwnerOrAdmin`) so standard members can only modify their own resources.

---

## FlowBoard Squad Sprint — Day 2 of 4

* **Sprint Goal:** Split `/auth/register` & `/login`, `requireAuth` middleware, and workspace RBAC across your squad. When `req.user` types land on `main`, merge or rebase `main` into your active feature branch and update your routes.
