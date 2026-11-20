import "dotenv/config";

export const env = {
  PORT: Number(process.env.PORT || 4000),
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/class_resources",
  JWT_SECRET: process.env.JWT_SECRET || "dev-local-secret-change-in-production",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@class.edu",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  NODE_ENV: process.env.NODE_ENV || "development",
  GOOGLE_DRIVE_API_KEY: process.env.GOOGLE_DRIVE_API_KEY || "",
  GOOGLE_DRIVE_FOLDER_ID:
    process.env.GOOGLE_DRIVE_FOLDER_ID || "1SkCEz1qZHb-qFAvo9pJm8_Agc8QXDdFl",
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
  GITHUB_DEFAULT_REPO: process.env.GITHUB_DEFAULT_REPO || "",
  GITHUB_DEFAULT_BRANCH: process.env.GITHUB_DEFAULT_BRANCH || "main",
};
