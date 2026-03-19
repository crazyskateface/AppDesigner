import { z } from "zod";

import type { WorkspaceFileKind } from "@/lib/workspace/model";

export const workspaceEditOperationTypeSchema = z.enum(["create-file", "replace-file", "delete-file"]);
export const workspaceEditExistingStateSchema = z.enum(["must-exist", "must-not-exist", "either"]);

export const workspaceEditOperationSchema = z.object({
  id: z.string().min(1),
  type: workspaceEditOperationTypeSchema,
  path: z.string().min(1),
  kind: z.custom<WorkspaceFileKind>((value) => value === "source" || value === "config" || value === "asset"),
  expectedExistingState: workspaceEditExistingStateSchema,
  previousContentHash: z.string().min(1).nullable().default(null),
  nextContent: z.string().nullable().default(null),
  reason: z.string().min(1),
});

export const workspaceEditSkipReasonSchema = z.enum(["identical-content", "path-not-allowed"]);

export const workspaceEditSkippedFileSchema = z.object({
  path: z.string().min(1),
  reason: workspaceEditSkipReasonSchema,
});

export const workspaceEditChangeSetSchema = z.object({
  changeSetId: z.string().min(1),
  projectId: z.string().min(1),
  workspaceId: z.string().min(1),
  runtimeId: z.string().min(1).nullable().default(null),
  mode: z.literal("edit"),
  summary: z.string().min(1),
  source: z.enum(["plan-diff"]).default("plan-diff"),
  repairNotes: z.array(z.string().min(1)).default([]),
  operations: z.array(workspaceEditOperationSchema).max(40),
  skippedFiles: z.array(workspaceEditSkippedFileSchema).default([]),
});

export type WorkspaceEditOperation = z.infer<typeof workspaceEditOperationSchema>;
export type WorkspaceEditSkippedFile = z.infer<typeof workspaceEditSkippedFileSchema>;
export type WorkspaceEditChangeSet = z.infer<typeof workspaceEditChangeSetSchema>;
