import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  PROJECT_DIFFICULTIES,
  RESOURCE_TYPES,
  type MiniProjectMilestone,
} from "@repo/shared";

export const resourceTypeEnum = pgEnum("resource_type", RESOURCE_TYPES);
export const projectDifficultyEnum = pgEnum(
  "project_difficulty",
  PROJECT_DIFFICULTIES
);

export const days = pgTable("days", {
  id: uuid("id").defaultRandom().primaryKey(),
  dayNumber: integer("day_number").notNull().unique(),
  title: text("title").notNull(),
  date: timestamp("date", { withTimezone: true }),
  summary: text("summary"),
  passwordHash: text("password_hash"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dayId: uuid("day_id")
      .notNull()
      .references(() => days.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: resourceTypeEnum("type").notNull().default("OTHER"),
    url: text("url"),
    content: text("content"),
    language: text("language"),
    filename: text("filename"),
    runCommand: text("run_command"),
    githubRepoUrl: text("github_repo_url"),
    githubBranch: text("github_branch"),
    githubPath: text("github_path"),
    githubCommitSha: text("github_commit_sha"),
    githubPushedAt: timestamp("github_pushed_at", { withTimezone: true }),
    order: integer("order").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    driveFileId: text("drive_file_id"),
    driveModifiedTime: timestamp("drive_modified_time", { withTimezone: true }),
    driveMd5Checksum: text("drive_md5_checksum"),
    driveSourcePath: text("drive_source_path"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("resources_drive_file_id_idx").on(table.driveFileId)]
);

export const resourceFiles = pgTable(
  "resource_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    content: text("content").notNull(),
    language: text("language"),
    sizeBytes: integer("size_bytes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("resource_files_resource_path_idx").on(
      table.resourceId,
      table.path
    ),
  ]
);

export const miniProjects = pgTable(
  "mini_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dayId: uuid("day_id").references(() => days.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    summary: text("summary"),
    instructions: text("instructions"),
    milestones: jsonb("milestones")
      .$type<MiniProjectMilestone[]>()
      .notNull()
      .default([]),
    starterRepoUrl: text("starter_repo_url"),
    demoUrl: text("demo_url"),
    specUrl: text("spec_url"),
    solutionUrl: text("solution_url"),
    attachmentUrl: text("attachment_url"),
    difficulty: projectDifficultyEnum("difficulty")
      .notNull()
      .default("INTERMEDIATE"),
    estimatedMinutes: integer("estimated_minutes"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    dueDate: timestamp("due_date", { withTimezone: true }),
    order: integer("order").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    driveFileId: text("drive_file_id"),
    driveModifiedTime: timestamp("drive_modified_time", { withTimezone: true }),
    driveMd5Checksum: text("drive_md5_checksum"),
    driveSourcePath: text("drive_source_path"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("mini_projects_drive_file_id_idx").on(table.driveFileId),
  ]
);

export const dayUnlockAttempts = pgTable(
  "day_unlock_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dayId: uuid("day_id")
      .notNull()
      .references(() => days.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address").notNull(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("day_unlock_attempts_day_ip_idx").on(
      table.dayId,
      table.ipAddress
    ),
  ]
);

export const daysRelations = relations(days, ({ many }) => ({
  resources: many(resources),
  miniProjects: many(miniProjects),
  unlockAttempts: many(dayUnlockAttempts),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  day: one(days, {
    fields: [resources.dayId],
    references: [days.id],
  }),
  files: many(resourceFiles),
}));

export const resourceFilesRelations = relations(resourceFiles, ({ one }) => ({
  resource: one(resources, {
    fields: [resourceFiles.resourceId],
    references: [resources.id],
  }),
}));

export const miniProjectsRelations = relations(miniProjects, ({ one }) => ({
  day: one(days, {
    fields: [miniProjects.dayId],
    references: [days.id],
  }),
}));

export const dayUnlockAttemptsRelations = relations(
  dayUnlockAttempts,
  ({ one }) => ({
    day: one(days, {
      fields: [dayUnlockAttempts.dayId],
      references: [days.id],
    }),
  })
);


