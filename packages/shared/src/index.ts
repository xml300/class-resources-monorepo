import { z } from "zod";

export const RESOURCE_TYPES = [
  "SLIDES",
  "VIDEO",
  "READING",
  "CODE",
  "ASSIGNMENT",
  "OTHER",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  SLIDES: "Slides",
  VIDEO: "Video",
  READING: "Reading",
  CODE: "Code",
  ASSIGNMENT: "Assignment",
  OTHER: "Other",
};

export const resourceTypeSchema = z.enum(RESOURCE_TYPES);

export const PROJECT_DIFFICULTIES = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
] as const;

export type ProjectDifficulty = (typeof PROJECT_DIFFICULTIES)[number];

export const PROJECT_DIFFICULTY_LABELS: Record<ProjectDifficulty, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const projectDifficultySchema = z.enum(PROJECT_DIFFICULTIES);

export const createDaySchema = z.object({
  dayNumber: z.coerce.number().int().min(1, "Day number must be at least 1"),
  title: z.string().trim().min(1, "Title is required").max(200),
  date: z.string().nullable().optional(),
  summary: z.string().trim().max(2000).nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  password: z.string().max(200).nullable().optional(),
});

export const updateDaySchema = createDaySchema.partial();

export const unlockDaySchema = z.object({
  password: z.string().min(1, "Password is required").max(200),
});

export const createResourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  type: resourceTypeSchema.default("OTHER"),
  url: z.string().trim().min(1, "URL or file path is required").max(2000),
  content: z.string().max(100000).nullable().optional(),
  order: z.coerce.number().int().min(0).optional().default(0),
  publishedAt: z.string().nullable().optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export const miniProjectMilestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1, "Milestone title is required").max(300),
  description: z.string().trim().max(1000).nullable().optional(),
});

export type MiniProjectMilestone = z.infer<typeof miniProjectMilestoneSchema>;

export const createMiniProjectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  summary: z.string().trim().max(1000).nullable().optional(),
  instructions: z.string().max(20000).nullable().optional(),
  milestones: z.array(miniProjectMilestoneSchema).optional().default([]),
  starterRepoUrl: z.string().trim().max(2000).nullable().optional(),
  demoUrl: z.string().trim().max(2000).nullable().optional(),
  specUrl: z.string().trim().max(2000).nullable().optional(),
  solutionUrl: z.string().trim().max(2000).nullable().optional(),
  attachmentUrl: z.string().trim().max(2000).nullable().optional(),
  dayId: z.string().uuid().nullable().optional(),
  difficulty: projectDifficultySchema.default("INTERMEDIATE"),
  estimatedMinutes: z.coerce
    .number()
    .int()
    .min(5)
    .max(10000)
    .nullable()
    .optional(),
  tags: z.array(z.string().trim().min(1).max(50)).optional().default([]),
  dueDate: z.string().nullable().optional(),
  order: z.coerce.number().int().min(0).optional().default(0),
  publishedAt: z.string().nullable().optional(),
});

export const updateMiniProjectSchema = createMiniProjectSchema.partial();

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export type CreateDayInput = z.infer<typeof createDaySchema>;
export type UpdateDayInput = z.infer<typeof updateDaySchema>;
export type UnlockDayInput = z.infer<typeof unlockDaySchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type CreateMiniProjectInput = z.infer<typeof createMiniProjectSchema>;
export type UpdateMiniProjectInput = z.infer<typeof updateMiniProjectSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface ResourceDTO {
  id: string;
  dayId: string;
  title: string;
  description: string | null;
  type: ResourceType;
  url: string;
  content: string | null;
  order: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DayDTO {
  id: string;
  dayNumber: number;
  title: string;
  date: string | null;
  summary: string | null;
  hasPassword: boolean;
  isLocked: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DayWithResourcesDTO extends DayDTO {
  resources: ResourceDTO[];
}

export interface MiniProjectDaySummaryDTO {
  id: string;
  dayNumber: number;
  title: string;
}

export interface MiniProjectDTO {
  id: string;
  title: string;
  summary: string | null;
  instructions: string | null;
  milestones: MiniProjectMilestone[];
  starterRepoUrl: string | null;
  demoUrl: string | null;
  specUrl: string | null;
  solutionUrl: string | null;
  attachmentUrl: string | null;
  dayId: string | null;
  day?: MiniProjectDaySummaryDTO | null;
  difficulty: ProjectDifficulty;
  estimatedMinutes: number | null;
  tags: string[];
  dueDate: string | null;
  order: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PublishStatus = "published" | "scheduled" | "draft";

export function getPublishStatus(
  publishedAt: string | null | undefined,
  now: Date = new Date()
): PublishStatus {
  if (!publishedAt) return "draft";
  const ts = new Date(publishedAt).getTime();
  if (Number.isNaN(ts)) return "draft";
  return ts <= now.getTime() ? "published" : "scheduled";
}

