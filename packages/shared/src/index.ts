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

export const createDaySchema = z.object({
  dayNumber: z.coerce.number().int().min(1, "Day number must be at least 1"),
  title: z.string().trim().min(1, "Title is required").max(200),
  date: z.string().nullable().optional(),
  summary: z.string().trim().max(2000).nullable().optional(),
  isPublished: z.boolean().optional().default(true),
});

export const updateDaySchema = createDaySchema.partial();

export const createResourceSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  type: resourceTypeSchema.default("OTHER"),
  url: z.string().trim().min(1, "URL or file path is required").max(2000),
  order: z.coerce.number().int().min(0).optional().default(0),
  isPublished: z.boolean().optional().default(true),
});

export const updateResourceSchema = createResourceSchema.partial();

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export type CreateDayInput = z.infer<typeof createDaySchema>;
export type UpdateDayInput = z.infer<typeof updateDaySchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface ResourceDTO {
  id: string;
  dayId: string;
  title: string;
  description: string | null;
  type: ResourceType;
  url: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DayDTO {
  id: string;
  dayNumber: number;
  title: string;
  date: string | null;
  summary: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DayWithResourcesDTO extends DayDTO {
  resources: ResourceDTO[];
}
