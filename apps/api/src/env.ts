import "dotenv/config";

function resolveDatabaseUrl(): string {
  const dbPort = process.env.DB_PORT;
  const rawUrl = process.env.DATABASE_URL;

  if (rawUrl) {
    if (dbPort) {
      const parsed = new URL(rawUrl);
      parsed.port = dbPort;
      return parsed.toString();
    }
    return rawUrl;
  }

  const host = process.env.DB_HOST || "localhost";
  const port = dbPort || "5432";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "postgres";
  const name = process.env.DB_NAME || "class_resources";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

export const env = {
  PORT: Number(process.env.PORT || 4000),
  DB_PORT: Number(process.env.DB_PORT || 5432),
  DATABASE_URL: resolveDatabaseUrl(),
  JWT_SECRET: process.env.JWT_SECRET || "dev-local-secret-change-in-production",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@class.edu",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  NODE_ENV: process.env.NODE_ENV || "development",
};
