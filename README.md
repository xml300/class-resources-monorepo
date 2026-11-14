# Class Resources Monorepo

A Turborepo monorepo using **npm workspaces** for managing and displaying daily class resource materials.

## Stack

- **Monorepo**: Turborepo + npm workspaces
- **Frontend (`apps/web`)**: Vite + React 19 + React Router + Tailwind CSS v4 + TypeScript
- **Backend (`apps/api`)**: Express + Drizzle ORM + PostgreSQL + Zod + JWT Auth + Multer uploads
- **Shared (`packages/shared`)**: Shared Zod validation schemas & TypeScript DTOs

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start PostgreSQL** (via Docker Compose or your own Postgres instance):
   ```bash
   docker compose up -d
   ```

3. **Configure environment variables**:
   Copy `apps/api/.env.example` to `apps/api/.env` and update values as needed:
   - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/class_resources`
   - `ADMIN_EMAIL=admin@class.edu`
   - `ADMIN_PASSWORD=admin123`

4. **Push Drizzle schema & seed sample data**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Run both frontend and backend in development**:
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000
   - Admin Panel: http://localhost:5173/admin

## Useful Scripts

- `npm run dev` — Start all apps in dev mode
- `npm run build` — Build all packages and apps
- `npm run typecheck` — Typecheck all workspaces
- `npm run db:generate` — Generate Drizzle SQL migrations
- `npm run db:push` — Push Drizzle schema to PostgreSQL
- `npm run db:seed` — Seed initial sample days and resources
