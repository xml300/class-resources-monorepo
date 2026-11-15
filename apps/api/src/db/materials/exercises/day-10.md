# Day 10: Docker, CI/CD, Cloud Deployment & Wrap-Up

## Coding Exercises & Deployment Labs

### Exercise 10.1 — `.dockerignore` & Build Context Audit
Create a `.dockerignore` excluding `node_modules`, `dist`, `.git`, and `.env` so Docker builds stay fast and never bake local secrets into an image.

### Exercise 10.2 — Multi-Stage `Dockerfile`
Write a multi-stage `Dockerfile` where the `builder` stage compiles TypeScript (`tsc`) and the final runtime stage copies only `dist/` and production dependencies (`npm ci --omit=dev`).

### Exercise 10.3 — Local Container Smoke Test
Build your image with `docker build -t my-api .`, run it with `docker run --env-file .env -p 3000:3000 my-api`, and verify `GET /health` returns `200`.

### Lab 10.4 — GitHub Actions CI Pipeline
Configure and verify `.github/workflows/ci.yml` so every pull request automatically runs `npm ci`, `npx tsc --noEmit`, `npm run lint`, and `npm test`.

### Lab 10.5 — Neon + Railway Live Deployment
* Provision a free **Neon** PostgreSQL database and run your migrations against it.
* Deploy your Dockerized Express app to **Railway**, configure your environment variables (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`), and verify:
  * `GET /health` returns `200`
  * Structured `pino` JSON logs appear in Railway's log explorer
  * Triggering a redeploy or stop produces clean `SIGTERM` shutdown logs
