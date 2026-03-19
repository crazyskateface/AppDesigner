import { z } from "zod";

import { builderModeSchema } from "@/lib/domain/app-spec";

const projectMemorySourceSchema = z.enum([
  "prompt",
  "clarification",
  "generation",
  "runtime-fix",
  "runtime",
]);

export const projectMemoryPromptEntrySchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  mode: builderModeSchema,
  createdAt: z.string().min(1),
});

export const projectMemoryClarificationAnswerSchema = z.object({
  questionId: z.string().min(1),
  label: z.string().min(1),
  answer: z.string().min(1),
});

export const projectMemoryClarificationBatchSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  answers: z.array(projectMemoryClarificationAnswerSchema).max(3),
  createdAt: z.string().min(1),
});

export const projectMemoryDecisionSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  source: projectMemorySourceSchema,
  createdAt: z.string().min(1),
});

export const projectMemoryConstraintSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  source: projectMemorySourceSchema,
  createdAt: z.string().min(1),
});

export const projectMemoryProjectStateSchema = z.object({
  appTitle: z.string().min(1).nullable().default(null),
  archetype: z.string().min(1).nullable().default(null),
  pageTitles: z.array(z.string().min(1)).max(12).default([]),
  entityNames: z.array(z.string().min(1)).max(16).default([]),
  lastSpecId: z.string().min(1).nullable().default(null),
  runtimeStatus: z.string().min(1).nullable().default(null),
  lastFailure: z.string().min(1).nullable().default(null),
});

export const projectMemoryOutcomeKindSchema = z.enum([
  "generation-succeeded",
  "generation-failed",
  "repair-fixed",
  "repair-failed",
  "repair-aborted",
  "runtime-recovered",
]);

export const projectMemoryOutcomeSchema = z.object({
  id: z.string().min(1),
  kind: projectMemoryOutcomeKindSchema,
  summary: z.string().min(1),
  createdAt: z.string().min(1),
});

export const projectMemoryChangeKindSchema = z.enum([
  "prompt",
  "clarification",
  "decision",
  "constraint",
  "outcome",
  "project-state",
]);

export const projectMemoryChangeSchema = z.object({
  kind: projectMemoryChangeKindSchema,
  summary: z.string().min(1),
  detail: z.string().min(1).optional(),
});

export const projectBuildMemorySchema = z.object({
  projectId: z.string().min(1),
  updatedAt: z.string().min(1),
  currentDirection: z.object({
    summary: z.string(),
    mode: builderModeSchema.default("create"),
  }),
  recentPrompts: z.array(projectMemoryPromptEntrySchema).max(5).default([]),
  clarifications: z.array(projectMemoryClarificationBatchSchema).max(3).default([]),
  decisions: z.array(projectMemoryDecisionSchema).max(12).default([]),
  constraints: z.array(projectMemoryConstraintSchema).max(12).default([]),
  projectState: projectMemoryProjectStateSchema.default({
    appTitle: null,
    archetype: null,
    pageTitles: [],
    entityNames: [],
    lastSpecId: null,
    runtimeStatus: null,
    lastFailure: null,
  }),
  recentOutcomes: z.array(projectMemoryOutcomeSchema).max(8).default([]),
  llmContextSummary: z.string().default(""),
});

export const projectMemoryLogRequestSchema = z.object({
  projectId: z.string().min(1),
  changes: z.array(projectMemoryChangeSchema).min(1).max(10),
  memory: projectBuildMemorySchema,
});

export type ProjectBuildMemory = z.infer<typeof projectBuildMemorySchema>;
export type ProjectMemoryChange = z.infer<typeof projectMemoryChangeSchema>;
export type ProjectMemoryOutcome = z.infer<typeof projectMemoryOutcomeSchema>;
