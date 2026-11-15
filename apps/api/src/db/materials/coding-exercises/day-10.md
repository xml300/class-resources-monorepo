# Day 10: Docker, CI/CD, Cloud Deployment & Wrap-Up

## Coding Exercises & Deployment Labs

### Exercise 10.1 — `.dockerignore` & Build Context Audit
Create a `.dockerignore` excluding unnecessary files and secrets so Docker builds stay fast and never bake local credentials into an image.

### Exercise 10.2 — Multi-Stage `Dockerfile`
Write a multi-stage `Dockerfile` where the builder stage compiles TypeScript and the final runtime stage copies only compiled output and production dependencies.

### Exercise 10.3 — Local Container Smoke Test
Build your image, run it locally with your `.env` file, and verify `GET /health` returns `200`.

### Lab 10.4 — GitHub Actions CI Pipeline
Configure and verify `.github/workflows/ci.yml` so every pull request automatically installs dependencies, typechecks, lints, and runs tests.

### Lab 10.5 — Neon + Railway Live Deployment
* Create a production **Neon** database branch and run your migrations against it.
* Deploy your Dockerized Express app to **Railway**, configure your required environment variables, and verify:
  * `GET /health` returns `200`
  * Structured JSON logs appear in Railway's log explorer
  * Triggering a redeploy or stop produces clean `SIGTERM` shutdown logs
