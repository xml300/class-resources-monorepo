import type {
  CreateDayInput,
  CreateMiniProjectInput,
  CreateResourceInput,
  DayWithResourcesDTO,
  LoginInput,
  MiniProjectDTO,
  ResourceDTO,
  ResourceWithDayDTO,
  UpdateDayInput,
  UpdateMiniProjectInput,
  UpdateResourceInput,
} from "@repo/shared";

export class ApiError extends Error {
  status: number;
  remainingAttempts?: number;
  retryAfterSeconds?: number;
  lockedUntil?: string;

  constructor(
    message: string,
    status: number,
    extra?: {
      remainingAttempts?: number;
      retryAfterSeconds?: number;
      lockedUntil?: string;
    }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.remainingAttempts = extra?.remainingAttempts;
    this.retryAfterSeconds = extra?.retryAfterSeconds;
    this.lockedUntil = extra?.lockedUntil;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.error || `Request failed with status ${res.status}`,
      res.status,
      {
        remainingAttempts: body.remainingAttempts,
        retryAfterSeconds: body.retryAfterSeconds,
        lockedUntil: body.lockedUntil,
      }
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Public
  getPublicDays: () => request<DayWithResourcesDTO[]>("/api/days"),
  getPublicDay: (id: string) => request<DayWithResourcesDTO>(`/api/days/${id}`),
  unlockDay: (id: string, password: string) =>
    request<{ unlocked: boolean; dayId: string }>(`/api/days/${id}/unlock`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  refreshDayResources: (dayId: string) =>
    request<DayWithResourcesDTO>(`/api/days/${dayId}/refresh`, {
      method: "POST",
    }),
  refreshResourceMarkdown: (dayId: string, resourceId: string) =>
    request<{ resource: ResourceDTO }>(
      `/api/days/${dayId}/resources/${resourceId}/refresh`,
      {
        method: "POST",
      }
    ),
  getPublicExercises: (params?: { day?: number; dayId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.dayId) qs.set("dayId", params.dayId);
    else if (params?.day !== undefined) qs.set("day", String(params.day));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<ResourceWithDayDTO[]>(`/api/exercises${suffix}`);
  },
  getPublicExercise: (id: string) =>
    request<ResourceWithDayDTO>(`/api/exercises/${id}`),
  getPublicCodeResources: (params?: { day?: number; dayId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.dayId) qs.set("dayId", params.dayId);
    else if (params?.day !== undefined) qs.set("day", String(params.day));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<ResourceWithDayDTO[]>(`/api/code${suffix}`);
  },
  getPublicCodeResource: (id: string) =>
    request<ResourceWithDayDTO>(`/api/code/${id}`),
  getPublicMiniProjects: (params?: { day?: number; dayId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.dayId) qs.set("dayId", params.dayId);
    else if (params?.day !== undefined) qs.set("day", String(params.day));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<MiniProjectDTO[]>(`/api/mini-projects${suffix}`);
  },
  getPublicMiniProject: (id: string) =>
    request<MiniProjectDTO>(`/api/mini-projects/${id}`),

  // Auth
  getMe: () =>
    request<{ authenticated: boolean; email: string | null }>("/api/auth/me"),
  login: (data: LoginInput) =>
    request<{ authenticated: boolean; email: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () =>
    request<{ authenticated: boolean }>("/api/auth/logout", {
      method: "POST",
    }),

  // Admin Days
  getAdminDays: () => request<DayWithResourcesDTO[]>("/api/admin/days"),
  getAdminDay: (id: string) =>
    request<DayWithResourcesDTO>(`/api/admin/days/${id}`),
  createDay: (data: CreateDayInput) =>
    request<DayWithResourcesDTO>("/api/admin/days", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateDay: (id: string, data: UpdateDayInput) =>
    request<DayWithResourcesDTO>(`/api/admin/days/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteDay: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/api/admin/days/${id}`, {
      method: "DELETE",
    }),

  // Admin Resources
  createResource: (dayId: string, data: CreateResourceInput) =>
    request<ResourceDTO>(`/api/admin/days/${dayId}/resources`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateResource: (id: string, data: UpdateResourceInput) =>
    request<ResourceDTO>(`/api/admin/resources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteResource: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/api/admin/resources/${id}`, {
      method: "DELETE",
    }),

  // Admin Mini Projects
  getAdminMiniProjects: () =>
    request<MiniProjectDTO[]>("/api/admin/mini-projects"),
  getAdminMiniProject: (id: string) =>
    request<MiniProjectDTO>(`/api/admin/mini-projects/${id}`),
  createMiniProject: (data: CreateMiniProjectInput) =>
    request<MiniProjectDTO>("/api/admin/mini-projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateMiniProject: (id: string, data: UpdateMiniProjectInput) =>
    request<MiniProjectDTO>(`/api/admin/mini-projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteMiniProject: (id: string) =>
    request<{ deleted: boolean; id: string }>(
      `/api/admin/mini-projects/${id}`,
      {
        method: "DELETE",
      }
    ),

  // Upload
  uploadFile: async (
    file: File
  ): Promise<{ url: string; filename: string; size: number }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "File upload failed");
    }
    return res.json();
  },

  syncMaterials: (options?: { force?: boolean }) =>
    request<{
      source: "drive";
      scannedFiles: number;
      downloadedFiles: number;
      skippedUnchanged: number;
      daysCreated: number;
      daysUpdated: number;
      resourcesCreated: number;
      resourcesUpdated: number;
      miniProjectsCreated: number;
      miniProjectsUpdated: number;
      warnings: string[];
      durationMs: number;
    }>(
      `/api/admin/sync-materials${options?.force ? "?force=true" : ""}`,
      {
        method: "POST",
      }
    ),
};
