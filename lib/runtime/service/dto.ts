import { z } from "zod";

import { appSpecSchema } from "@/lib/domain/app-spec";
import type { WorkspaceEditChangeSet, WorkspaceEditSkippedFile } from "@/lib/builder/edits/schema";
import type { CodeChangeDiff } from "@/lib/builder/verification/schema";
import { projectBuildMemorySchema } from "@/lib/project-memory/schema";
import { workspaceFileSchema } from "@/lib/workspace/schemas";
import type { RunnerStatus } from "@/lib/runtime/contracts";
import type { RuntimeFailure, RuntimeLogEntry } from "@/lib/runtime/logs";

export const startRuntimeInputSchema = z.object({
  projectId: z.string().min(1),
  generatedSpec: appSpecSchema,
  projectMemory: projectBuildMemorySchema.optional(),
  directEdit: z
    .object({
      strategy: z.literal("direct-ui-source-edit"),
      summary: z.string().min(1),
      files: z.array(workspaceFileSchema).min(1).max(12),
      notes: z.array(z.string().min(1)).max(8).default([]),
    })
    .optional(),
});

export type StartRuntimeInput = z.infer<typeof startRuntimeInputSchema>;

export const runtimeUpdateStrategySchema = z.enum([
  "hot-update",
  "dev-server-restart",
  "full-runtime-restart-required",
]);

export const updateRuntimeInputSchema = z.object({
  generatedSpec: appSpecSchema,
  projectMemory: projectBuildMemorySchema.optional(),
  directEdit: z
    .object({
      strategy: z.literal("direct-ui-source-edit"),
      summary: z.string().min(1),
      files: z.array(workspaceFileSchema).min(1).max(12),
      notes: z.array(z.string().min(1)).max(8).default([]),
    })
    .optional(),
});

export type RuntimeUpdateStrategy = z.infer<typeof runtimeUpdateStrategySchema>;
export type UpdateRuntimeInput = z.infer<typeof updateRuntimeInputSchema>;

export const browserRuntimeErrorReportSchema = z.object({
  source: z.enum(["error", "unhandledrejection", "react-error-boundary"]),
  message: z.string().trim().min(1),
  stack: z.string().trim().optional(),
  componentStack: z.string().trim().optional(),
  href: z.string().trim().optional(),
  timestamp: z.string().trim().optional(),
});

export type BrowserRuntimeErrorReport = z.infer<typeof browserRuntimeErrorReportSchema>;

export type RuntimeRepairAttempt = {
  attemptId: string;
  runtimeId: string;
  workspaceId: string;
  failureKind: "build" | "startup" | "runtime";
  failureSignature: string;
  status: "fixed" | "failed" | "aborted";
  startedAt: string;
  finishedAt: string;
  logExcerpt: string;
  diagnosticSummary: string;
  modifiedFiles: string[];
  provider?: {
    name: string;
    model?: string;
  };
  repaired: boolean;
};

export type RuntimeSession = {
  runtimeId: string;
  projectId: string;
  workspaceId: string;
  sourceSpecId: string;
  status: Exclude<RunnerStatus, "idle">;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
  failure?: RuntimeFailure;
  repairAttempts?: RuntimeRepairAttempt[];
};

export type RuntimeLogPage = {
  runtimeId: string;
  entries: RuntimeLogEntry[];
};

export type RuntimeUpdateResult = {
  session: RuntimeSession;
  strategyUsed: RuntimeUpdateStrategy;
  devServerRestarted: boolean;
  fullRuntimeRestartRequired: boolean;
  workspaceChangesApplied: boolean;
  attemptedPaths: string[];
  appliedPaths: string[];
  updatedPaths: string[];
  editChangeSet?: Pick<WorkspaceEditChangeSet, "changeSetId" | "summary"> & {
    operationPaths: string[];
    rejectedPaths: string[];
    skippedFiles: WorkspaceEditSkippedFile[];
  };
  codeVerification?: {
    generatedPaths: string[];
    generatedFileDiffs: CodeChangeDiff[];
    finalPathsChecked: string[];
    observedDiffs: CodeChangeDiff[];
    landedPaths: string[];
    missingPaths: string[];
    overwrittenPaths: string[];
    unchangedPaths: string[];
  };
  reason?: string;
};
