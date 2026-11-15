# Day 6: Authentication, Authorization & API Security

## Mini-Project: Auth & RBAC Middleware Sandbox

Build a standalone authentication and role-based access control API.

### Core (Required)
* Implement `POST /auth/register`, `POST /auth/login`, `GET /me` for authenticated users, and `DELETE /admin/users/:id` for admins only.
* Ensure password hashes are never returned in API responses.
* Return `401` for missing/invalid tokens and `403` when a user lacks the required role.

### Stretch
* Add security headers, strict CORS, and rate limiting on `POST /auth/login`.

### Challenge
* Add an ownership check middleware so standard members can only modify their own resources.

---

## Class-Wide Collaborative Project — Day 2 of 4

* **Sprint Goal:** Implement shared authentication, `requireAuth` middleware, and role-based access control across the class repository. When `req.user` types land on `main`, merge or rebase `main` into your active feature branch and update your routes.
