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

export const CODE_LANGUAGES = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "bash",
  "json",
  "sql",
  "dockerfile",
  "html",
  "css",
  "yaml",
  "markdown",
  "python",
  "diff",
  "plaintext",
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  tsx: "TSX",
  jsx: "JSX",
  bash: "Bash / Shell",
  json: "JSON",
  sql: "SQL",
  dockerfile: "Dockerfile",
  html: "HTML",
  css: "CSS",
  yaml: "YAML",
  markdown: "Markdown",
  python: "Python",
  diff: "Diff",
  plaintext: "Plain Text",
};

const LANGUAGE_ALIAS_MAP: Record<string, CodeLanguage> = {
  ts: "typescript",
  typescript: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  javascript: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  tsx: "tsx",
  jsx: "jsx",
  sh: "bash",
  bash: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  json: "json",
  jsonc: "json",
  sql: "sql",
  psql: "sql",
  docker: "dockerfile",
  dockerfile: "dockerfile",
  html: "html",
  htm: "html",
  css: "css",
  yml: "yaml",
  yaml: "yaml",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  python: "python",
  diff: "diff",
  patch: "diff",
  txt: "plaintext",
  text: "plaintext",
  plaintext: "plaintext",
};

export function normalizeCodeLanguage(
  raw?: string | null
): CodeLanguage | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return null;
  return LANGUAGE_ALIAS_MAP[cleaned] ?? null;
}

export function inferCodeLanguage(
  filenameOrUrl?: string | null,
  explicitLanguage?: string | null
): CodeLanguage | null {
  const normalizedExplicit = normalizeCodeLanguage(explicitLanguage);
  if (normalizedExplicit) return normalizedExplicit;
  if (!filenameOrUrl) return null;

  const cleanPath = filenameOrUrl.split("?")[0].split("#")[0];
  const base = cleanPath.split("/").pop()?.toLowerCase() ?? "";
  if (base === "dockerfile" || base.startsWith("dockerfile.")) {
    return "dockerfile";
  }
  const dotIdx = base.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const ext = base.slice(dotIdx + 1);
  return LANGUAGE_ALIAS_MAP[ext] ?? null;
}

export const resourceFileInputSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1, "File path is required")
    .max(500)
    .refine(
      (p) =>
        !p.startsWith("/") &&
        !p.includes("\\") &&
        !p.split("/").some((seg) => seg === ".." || seg === "."),
      "Invalid relative file path"
    ),
  content: z.string().max(1_000_000),
  language: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type ResourceFileInput = z.infer<typeof resourceFileInputSchema>;

export const uploadCodeFolderFilesSchema = z.object({
  files: z
    .array(resourceFileInputSchema)
    .min(1, "At least one file is required")
    .max(500, "Maximum 500 files per folder"),
  runCommand: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type UploadCodeFolderFilesInput = z.infer<
  typeof uploadCodeFolderFilesSchema
>;

export const pushResourceToGithubSchema = z.object({
  repoUrl: z
    .string()
    .trim()
    .min(1, "GitHub repository URL is required")
    .max(500),
  branch: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
  targetPath: z
    .string()
    .trim()
    .max(300)
    .optional()
    .default(""),
  commitMessage: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((val) => (val && val.length > 0 ? val : undefined)),
});

export type PushResourceToGithubInput = z.infer<
  typeof pushResourceToGithubSchema
>;

const resourceFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  type: resourceTypeSchema.default("OTHER"),
  url: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
  content: z
    .string()
    .max(100000)
    .nullable()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val : null)),
  language: z
    .string()
    .trim()
    .max(50)
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
  filename: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
  runCommand: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
  githubRepoUrl: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
  githubBranch: z
    .string()
    .trim()
    .max(100)
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
  githubPath: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .optional()
    .transform((val) => (val && val.length > 0 ? val : null)),
  files: z
    .array(resourceFileInputSchema)
    .max(500, "Maximum 500 files per folder")
    .optional(),
  order: z.coerce.number().int().min(0).optional().default(0),
  publishedAt: z.string().nullable().optional(),
});

export const createResourceSchema = resourceFieldsSchema.superRefine(
  (data, ctx) => {
    const hasFiles = Array.isArray(data.files) && data.files.length > 0;
    if (!data.url && !data.content && !hasFiles) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: "URL, uploaded file, pasted code, or code folder is required",
      });
    }
  }
);

export const updateResourceSchema = resourceFieldsSchema.partial();

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

export interface ResourceFileDTO {
  id: string;
  resourceId: string;
  path: string;
  content: string;
  language: string | null;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface PushToGithubResultDTO {
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  targetPath: string;
  folderUrl: string;
  commitSha: string;
  commitUrl: string;
  filesPushed: number;
  pushedAt: string;
}

export interface GithubStatusDTO {
  configured: boolean;
  defaultRepoUrl: string | null;
  defaultBranch: string;
}

export interface ResourceDTO {
  id: string;
  dayId: string;
  title: string;
  description: string | null;
  type: ResourceType;
  url: string | null;
  content: string | null;
  language: string | null;
  filename: string | null;
  runCommand?: string | null;
  githubRepoUrl?: string | null;
  githubBranch?: string | null;
  githubPath?: string | null;
  githubCommitSha?: string | null;
  githubPushedAt?: string | null;
  fileCount?: number;
  files?: ResourceFileDTO[];
  order: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceDaySummaryDTO {
  id: string;
  dayNumber: number;
  title: string;
}

export interface ResourceWithDayDTO extends ResourceDTO {
  day: ResourceDaySummaryDTO;
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

