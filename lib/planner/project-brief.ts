import { clarificationAnswerSchema } from "@/lib/planner/prompt-context";
import { projectBuildMemorySchema } from "@/lib/project-memory/schema";
import { z } from "zod";

export const projectBriefTargetKindValues = ["vite-react-static"] as const;
export const projectBriefSourceKindValues = ["app-spec-adapter", "llm-plan"] as const;

export const projectBriefTargetKindSchema = z.enum(projectBriefTargetKindValues);
export const projectBriefSourceKindSchema = z.enum(projectBriefSourceKindValues);

export const projectBriefNavigationItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  pageId: z.string().min(1),
});

export const projectBriefPageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  pageType: z.string().min(1),
  summary: z.string().min(1),
  sectionTitles: z.array(z.string().min(1)).max(6),
});

export const projectBriefSchema = z.object({
  briefId: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  summary: z.string().min(1),
  targetKind: projectBriefTargetKindSchema,
  navigation: z.array(projectBriefNavigationItemSchema).min(1).max(6),
  pages: z.array(projectBriefPageSchema).min(1).max(6),
  constraints: z.array(z.string().min(1)).min(1).max(8),
  source: z.object({
    kind: projectBriefSourceKindSchema,
    referenceId: z.string().min(1),
  }),
});

export const projectBriefPlanningRequestSchema = z.object({
  prompt: z.string().trim().min(20, "Prompt must be at least 20 characters long."),
  clarificationAnswers: z.array(clarificationAnswerSchema).max(3).default([]),
  projectMemory: projectBuildMemorySchema.optional(),
});

export type ProjectBrief = z.infer<typeof projectBriefSchema>;
export type ProjectBriefPage = z.infer<typeof projectBriefPageSchema>;
