import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { RESOURCE_TYPES } from "@repo/shared";

export const resourceTypeEnum = pgEnum("resource_type", RESOURCE_TYPES);

export const days = pgTable("days", {
  id: uuid("id").defaultRandom().primaryKey(),
  dayNumber: integer("day_number").notNull().unique(),
  title: text("title").notNull(),
  date: timestamp("date", { withTimezone: true }),
  summary: text("summary"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const resources = pgTable("resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  dayId: uuid("day_id")
    .notNull()
    .references(() => days.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: resourceTypeEnum("type").notNull().default("OTHER"),
  url: text("url").notNull(),
  order: integer("order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const daysRelations = relations(days, ({ many }) => ({
  resources: many(resources),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  day: one(days, {
    fields: [resources.dayId],
    references: [days.id],
  }),
}));
