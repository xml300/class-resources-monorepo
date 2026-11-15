# Cheat Sheet: Express.js, Zod & Error Handling (Day 4)

### Layered Architecture
`routes` (URL + middleware) → `controllers` (HTTP `req`/`res`) → `services` (business logic) → `db/repositories` (SQL)

### Zod Schema + Static Type Inference
```ts
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(120),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

### Generic Zod Validation Middleware
```ts
import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

export const validate = (schemas: {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}): RequestHandler => (req, _res, next) => {
  if (schemas.body)   req.body   = schemas.body.parse(req.body);
  if (schemas.query)  req.query  = schemas.query.parse(req.query);
  if (schemas.params) req.params = schemas.params.parse(req.params);
  next();
};
```

### Centralized `AppError` & 4-Arg Error Handler
```ts
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

// Register LAST in app.ts: app.use(errorHandler)
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.flatten() });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal server error" });
};
```

### HTTP Status Codes
`200` OK · `201` Created · `204` No Content · `400` Bad Request · `401` Unauthorized (not logged in) · `403` Forbidden (no permission) · `404` Not Found · `409` Conflict · `429` Too Many Requests · `500` Internal Error
