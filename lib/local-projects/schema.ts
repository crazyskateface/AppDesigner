import { z } from "zod";

import { appArchetypeSchema, appSpecSchema } from "@/lib/domain/app-spec/schema";

export const localProjectsStorageVersion = 1;

const persistedProjectStoredSchema = z.object({
  storageVersion: z.literal(localProjectsStorageVersion),
  projectId: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  lastOpenedAt: z.string().min(1),
  prompt: z.string(),
  generatedSpec: appSpecSchema.nullable().optional(),
  generatedConfig: appSpecSchema.nullable().optional(),
  manualTitleOverride: z.string().trim().min(1).nullable(),
  selectedPreviewPageId: z.string().min(1).nullable(),
});

export const persistedProjectSchema = persistedProjectStoredSchema.transform(
  ({ generatedSpec, generatedConfig, ...project }) => ({
    ...project,
    generatedSpec: generatedSpec ?? generatedConfig ?? null,
  }),
);

export const persistedProjectIndexSchema = z.object({
  storageVersion: z.literal(localProjectsStorageVersion),
  recentProjectIds: z.array(z.string()),
  lastOpenProjectId: z.string().min(1).nullable(),
});

export const recentProjectSummarySchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  archetype: appArchetypeSchema.nullable(),
  promptPreview: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type PersistedProject = z.infer<typeof persistedProjectSchema>;
export type PersistedProjectIndex = z.infer<typeof persistedProjectIndexSchema>;
export type RecentProjectSummary = z.infer<typeof recentProjectSummarySchema>;
