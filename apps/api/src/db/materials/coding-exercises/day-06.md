# Day 6: Authentication, Authorization & API Security

## Coding Exercises

### Exercise 6.1 — Password Hashing
Implement `hashPassword(plain)` and `verifyPassword(hash, plain)`, and verify that hashing the same password twice produces different outputs.

### Exercise 6.2 — JWT Sign & Verify Helpers
Implement `signToken({ sub, role })` with a 1-hour expiration and `verifyToken(token)` using `env.JWT_SECRET`, throwing a `401` `AppError` on expired or tampered tokens.

### Exercise 6.3 — Typed `req.user` & `requireAuth`
Extend Express's `Request` type so `req.user` is typed, then write a `requireAuth` middleware that extracts the `Authorization: Bearer <token>` header and attaches `req.user`.

### Exercise 6.4 — Role-Based Access Control
Write a `requireRole(...roles)` middleware factory that returns `403 Forbidden` if `req.user?.role` is not in the allowed list.

### Exercise 6.5 — Security Headers, CORS & Rate Limiting
Configure security headers, strict CORS for `env.CORS_ORIGIN`, and rate limiting on `/auth/login`.
