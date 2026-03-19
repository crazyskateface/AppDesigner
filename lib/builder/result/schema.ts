import { z } from "zod";

import { postApplyCodeVerificationSchema } from "@/lib/builder/verification/schema";
import { appSpecGenerationMetaSchema, appSpecSchema, builderModeSchema, pageTypeSchema, sectionTypeSchema } from "@/lib/domain/app-spec";

export const groundedBuildResultClassificationSchema = z.enum([
  "verified_success",
  "partial_success",
  "no_effect",
  "apply_failed",
  "runtime_failed",
]);

export const groundedBuildResultAssistantToneSchema = z.enum(["success", "warning", "error", "info"]);

export const groundedBuildResultRuntimeStrategySchema = z.enum([
  "none",
  "hot-update",
  "dev-server-restart",
  "full-runtime-start",
  "full-runtime-restart",
  "full-runtime-restart-required",
]);

export const groundedBuildResultSchema = z.object({
  turnId: z.string().min(1),
  projectId: z.string().min(1).nullable(),
  mode: builderModeSchema,
  userPrompt: z.string().min(1),
  request: z.object({
    summary: z.string().min(1),
    requestedSectionTypes: z.array(sectionTypeSchema).default([]),
    requestedPageTypes: z.array(pageTypeSchema).default([]),
    requestedUnsupportedFeatures: z.array(z.string().min(1)).default([]),
  }),
  attempt: z.object({
    summary: z.string().min(1),
    attemptedPaths: z.array(z.string().min(1)).default([]),
    appSpecChanged: z.boolean(),
    generationMeta: appSpecGenerationMetaSchema,
    nextSpec: appSpecSchema.optional(),
  }),
  applied: z.object({
    changed: z.boolean(),
    appliedPaths: z.array(z.string().min(1)).default([]),
    appSpecChanged: z.boolean(),
    addedSectionTypes: z.array(sectionTypeSchema).default([]),
    addedPageTypes: z.array(pageTypeSchema).default([]),
    addedPageTitles: z.array(z.string().min(1)).default([]),
    verifiedRequestedChanges: z.array(z.string().min(1)).default([]),
    unverifiedRequestedChanges: z.array(z.string().min(1)).default([]),
  }),
  runtime: z.object({
    status: z.enum(["skipped", "running", "restart-required", "failed"]),
    strategyUsed: groundedBuildResultRuntimeStrategySchema.default("none"),
    devServerRestarted: z.boolean().default(false),
    fullRuntimeRestartRequired: z.boolean().default(false),
    healthy: z.boolean(),
    reason: z.string().min(1).nullable().default(null),
    diagnosticSummary: z.string().min(1).nullable().default(null),
  }),
  verification: postApplyCodeVerificationSchema.nullable().default(null),
  classification: groundedBuildResultClassificationSchema,
  assistant: z.object({
    tone: groundedBuildResultAssistantToneSchema,
    message: z.string().min(1),
  }),
  memory: z.object({
    outcomeSummary: z.string().min(1),
    durableFacts: z.array(z.string().min(1)).default([]),
    updateProjectState: z.boolean().default(false),
  }),
});

export type GroundedBuildResult = z.infer<typeof groundedBuildResultSchema>;
export type GroundedBuildResultClassification = z.infer<typeof groundedBuildResultClassificationSchema>;
