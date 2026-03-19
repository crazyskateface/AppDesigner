import { z } from "zod";

import { projectBriefSchema } from "@/lib/planner/project-brief";
import { runtimeUpdateStrategySchema } from "@/lib/runtime/service/dto";
import { workspaceManifestSchema } from "@/lib/workspace/schemas";

export const orchestratorActionKindSchema = z.enum([
  "file.write-set",
  "dependency.change-set",
  "dev-server.control",
  "runtime.inspect",
]);

export const orchestratorActionStatusSchema = z.enum(["completed", "failed", "skipped", "planned-only"]);

export const fileWriteSetActionSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("file.write-set"),
  reason: z.string().min(1),
  executionPolicy: z.literal("execute"),
  safety: z.object({
    allowedPathScope: z.literal("app-owned-source-only"),
    maxFiles: z.number().int().positive(),
  }),
  inputs: z.object({
    targetKind: z.literal("vite-react-static"),
    projectBrief: projectBriefSchema,
    manifest: workspaceManifestSchema,
    fallback: z.enum(["none", "template"]).default("template"),
  }),
});

export const dependencyChangeSetActionSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("dependency.change-set"),
  reason: z.string().min(1),
  executionPolicy: z.enum(["execute", "planned-only"]),
  safety: z.object({
    allowExecution: z.boolean(),
    maxPackages: z.number().int().positive().max(8),
  }),
  inputs: z.object({
    packages: z.array(
      z.object({
        name: z.string().min(1),
        change: z.enum(["add", "remove", "update"]),
        version: z.string().min(1).optional(),
        section: z.enum(["dependencies", "devDependencies"]).default("dependencies"),
      }),
    ).max(8),
  }),
});

export const devServerControlActionSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("dev-server.control"),
  reason: z.string().min(1),
  executionPolicy: z.enum(["execute", "planned-only"]),
  safety: z.object({
    allowDirectExecution: z.boolean(),
  }),
  inputs: z.object({
    requestedStrategy: runtimeUpdateStrategySchema,
  }),
});

export const runtimeInspectionEvidenceKeySchema = z.enum([
  "runtime-status",
  "last-failure",
  "repair-attempts",
  "recent-logs",
  "browser-runtime-error",
]);

export const runtimeInspectActionSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("runtime.inspect"),
  reason: z.string().min(1),
  executionPolicy: z.literal("execute"),
  safety: z.object({
    maxLogEntries: z.number().int().min(0).max(100),
  }),
  inputs: z.object({
    requestedEvidence: z.array(runtimeInspectionEvidenceKeySchema).min(1).max(5),
  }),
});

export const orchestratorActionSchema = z.discriminatedUnion("kind", [
  fileWriteSetActionSchema,
  dependencyChangeSetActionSchema,
  devServerControlActionSchema,
  runtimeInspectActionSchema,
]);

export const orchestratorActionPlanSchema = z.object({
  goal: z.string().min(1),
  mode: z.enum(["clarify", "generate", "improve", "self-heal"]),
  actions: z.array(orchestratorActionSchema).min(1).max(8),
  constraints: z.array(z.string().min(1)).max(12).default([]),
  requiresUserIntervention: z.boolean().default(false),
});

export const runtimeInspectionSnapshotSchema = z.object({
  runtimeId: z.string().min(1).optional(),
  status: z.string().min(1).nullable().default(null),
  previewUrl: z.string().min(1).optional(),
  lastFailure: z.string().min(1).nullable().default(null),
  browserRuntimeError: z.string().min(1).nullable().default(null),
  repairAttemptSummaries: z.array(z.string().min(1)).max(5).default([]),
  recentLogs: z.array(z.string().min(1)).max(20).default([]),
});

export const orchestratorActionResultSchema = z.object({
  actionId: z.string().min(1),
  kind: orchestratorActionKindSchema,
  status: orchestratorActionStatusSchema,
  summary: z.string().min(1),
  artifacts: z.record(z.string(), z.unknown()).optional(),
  diagnostics: z.array(z.string().min(1)).max(8).default([]),
});

export type OrchestratorActionPlan = z.infer<typeof orchestratorActionPlanSchema>;
export type OrchestratorAction = z.infer<typeof orchestratorActionSchema>;
export type FileWriteSetAction = z.infer<typeof fileWriteSetActionSchema>;
export type DependencyChangeSetAction = z.infer<typeof dependencyChangeSetActionSchema>;
export type RuntimeInspectAction = z.infer<typeof runtimeInspectActionSchema>;
export type RuntimeInspectionSnapshot = z.infer<typeof runtimeInspectionSnapshotSchema>;
export type OrchestratorActionResult = z.infer<typeof orchestratorActionResultSchema>;
