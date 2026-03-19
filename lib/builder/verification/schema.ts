import { z } from "zod";

export const requestedCodeArtifactKindSchema = z.enum(["component", "file", "symbol", "page", "unknown"]);
export const requestedCodeEditKindSchema = z.enum(["create-file", "update-file", "multi-file-edit", "unknown"]);
export const codeChangeTypeSchema = z.enum(["create", "update", "delete"]);
export const codeLandingStatusSchema = z.enum(["landed", "unchanged", "missing", "overwritten"]);
export const postApplyCodeVerificationClassificationSchema = z.enum(["landed", "partial", "not_landed", "inconclusive"]);

export const requestedCodeArtifactHintSchema = z.object({
  kind: requestedCodeArtifactKindSchema,
  name: z.string().min(1).nullable().default(null),
});

export const codeChangeDiffSchema = z.object({
  path: z.string().min(1),
  changeType: codeChangeTypeSchema,
  beforeContent: z.string().nullable().default(null),
  generatedContent: z.string().nullable().default(null),
  finalContent: z.string().nullable().default(null),
  landingStatus: codeLandingStatusSchema.default("landed"),
});

export const postApplyCodeVerificationSchema = z.object({
  request: z.object({
    requestSummary: z.string().min(1),
    requestedEditKind: requestedCodeEditKindSchema,
    requestedArtifactHints: z.array(requestedCodeArtifactHintSchema).default([]),
  }),
  generated: z.object({
    generatedPaths: z.array(z.string().min(1)).default([]),
    normalizedPaths: z.array(z.string().min(1)).default([]),
    generatedFileDiffs: z.array(codeChangeDiffSchema).default([]),
    generatedChangeSummary: z.string().min(1),
  }),
  apply: z.object({
    attemptedPaths: z.array(z.string().min(1)).default([]),
    appliedPaths: z.array(z.string().min(1)).default([]),
    workspaceChangesApplied: z.boolean(),
    runtimeId: z.string().min(1).nullable().default(null),
    workspaceId: z.string().min(1).nullable().default(null),
    applyStrategy: z.enum(["hot-update", "dev-server-restart", "full-runtime-restart-required", "none"]),
  }),
  final: z.object({
    finalPathsChecked: z.array(z.string().min(1)).default([]),
    observedDiffs: z.array(codeChangeDiffSchema).default([]),
    missingExpectedDiffs: z.array(z.string().min(1)).default([]),
    overwrittenDiffs: z.array(z.string().min(1)).default([]),
    unchangedDiffs: z.array(z.string().min(1)).default([]),
  }),
  classification: postApplyCodeVerificationClassificationSchema,
  verifiedLandedEdits: z.array(z.string().min(1)).default([]),
  droppedEdits: z.array(z.string().min(1)).default([]),
  inconclusiveEdits: z.array(z.string().min(1)).default([]),
  summary: z.string().min(1),
});

export type RequestedCodeArtifactHint = z.infer<typeof requestedCodeArtifactHintSchema>;
export type CodeChangeDiff = z.infer<typeof codeChangeDiffSchema>;
export type PostApplyCodeVerificationResult = z.infer<typeof postApplyCodeVerificationSchema>;
