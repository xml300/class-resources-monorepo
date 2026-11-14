import "dotenv/config";
import { defineConfig } from "drizzle-kit";

function getDatabaseUrl(): string {
  const dbPort = process.env.DB_PORT;
  const rawUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/class_resources";

  if (dbPort) {
    const parsed = new URL(rawUrl);
    parsed.port = dbPort;
    return parsed.toString();
  }
  return rawUrl;
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
