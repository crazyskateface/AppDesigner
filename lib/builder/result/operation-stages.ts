import { z } from "zod";

import type { EditModeStrategy } from "@/lib/builder/edits/edit-mode-router";
import type { AppSpecGenerationMeta } from "@/lib/domain/app-spec";
import type { RuntimeSession, RuntimeUpdateResult } from "@/lib/runtime/service/dto";
import type { PostApplyCodeVerificationResult } from "@/lib/builder/verification/schema";

export const operationStageStatusSchema = z.enum([
  "not_started",
  "succeeded",
  "failed",
  "skipped",
  "partial",
]);

export type OperationStageStatus = z.infer<typeof operationStageStatusSchema>;

export const operationStageSchema = z.object({
  status: operationStageStatusSchema,
  detail: z.string().min(1).nullable().default(null),
});

export const operationStageWithEvidenceSchema = operationStageSchema.extend({
  evidence: z.array(z.string().min(1)).default([]),
});

export const operationStagesSchema = z.object({
  generation: operationStageSchema,
  apply: operationStageSchema,
  validation: operationStageSchema,
  runtime: operationStageSchema,
  verification: operationStageWithEvidenceSchema,
});

export type OperationStage = z.infer<typeof operationStageSchema>;
export type OperationStageWithEvidence = z.infer<typeof operationStageWithEvidenceSchema>;
export type OperationStages = z.infer<typeof operationStagesSchema>;

export type DeriveOperationStagesInput = {
  mode: "create" | "edit";
  generationMeta: AppSpecGenerationMeta;
  updateResult?: RuntimeUpdateResult | null;
  restartedRuntimeSession?: RuntimeSession | null;
  noOpReason?: string | null;
  applyErrorMessage?: string | null;
  verification?: PostApplyCodeVerificationResult | null;
  editStrategy?: EditModeStrategy | null;
};

function deriveGenerationStage(input: DeriveOperationStagesInput): OperationStage {
  if (input.generationMeta.source === "llm") {
    return {
      status: input.generationMeta.repaired ? "partial" : "succeeded",
      detail: input.generationMeta.repaired
        ? "LLM output required normalization repair."
        : null,
    };
  }

  return {
    status: "partial",
    detail: input.generationMeta.fallbackReason
      ? `Used template fallback: ${input.generationMeta.fallbackReason}.`
      : "Used template fallback.",
  };
}

function deriveApplyStage(input: DeriveOperationStagesInput): OperationStage {
  if (input.applyErrorMessage) {
    return { status: "failed", detail: input.applyErrorMessage };
  }

  if (input.noOpReason) {
    return { status: "skipped", detail: input.noOpReason };
  }

  if (input.mode === "create") {
    return { status: "succeeded", detail: "Workspace materialized for initial creation." };
  }

  if (input.updateResult?.workspaceChangesApplied && input.updateResult.appliedPaths.length > 0) {
    return {
      status: "succeeded",
      detail: `Applied ${input.updateResult.appliedPaths.length} file(s).`,
    };
  }

  if (input.updateResult && !input.updateResult.workspaceChangesApplied) {
    return { status: "skipped", detail: "No workspace file changes were needed." };
  }

  return { status: "skipped", detail: null };
}

function deriveValidationStage(input: DeriveOperationStagesInput): OperationStage {
  if (input.noOpReason) {
    return { status: "skipped", detail: input.noOpReason };
  }

  if (input.applyErrorMessage) {
    return { status: "skipped", detail: "Skipped because apply failed." };
  }

  if (input.mode === "edit" && input.updateResult?.editChangeSet) {
    const rejected = input.updateResult.editChangeSet.rejectedPaths;

    if (rejected.length === 0) {
      return { status: "succeeded", detail: "Change set validated." };
    }

    const attempted = input.updateResult.editChangeSet.operationPaths;

    if (rejected.length < attempted.length) {
      return {
        status: "partial",
        detail: `${rejected.length} of ${attempted.length} operations rejected during validation.`,
      };
    }

    return {
      status: "failed",
      detail: `All ${rejected.length} operations rejected during validation.`,
    };
  }

  if (input.mode === "create") {
    return { status: "succeeded", detail: "Source bundle normalized successfully." };
  }

  return { status: "succeeded", detail: null };
}

function deriveRuntimeStage(input: DeriveOperationStagesInput): OperationStage {
  if (input.applyErrorMessage || input.noOpReason) {
    return {
      status: "skipped",
      detail: input.applyErrorMessage ? "Skipped because apply failed." : "No runtime action needed.",
    };
  }

  const session = input.restartedRuntimeSession ?? input.updateResult?.session;

  if (!session) {
    if (input.mode === "create") {
      return { status: "failed", detail: "No runtime session was created." };
    }
    return { status: "skipped", detail: null };
  }

  if (session.status === "running" || session.status === "starting") {
    return { status: "succeeded", detail: null };
  }

  return {
    status: "failed",
    detail: session.failure?.message ?? "Runtime did not reach running state.",
  };
}

function deriveVerificationStage(input: DeriveOperationStagesInput): OperationStageWithEvidence {
  if (input.noOpReason || input.applyErrorMessage) {
    return { status: "skipped", detail: null, evidence: [] };
  }

  // Edit mode with file-level code verification
  if (input.verification) {
    const isDirectUiEdit = input.editStrategy === "direct-ui-source-edit";

    switch (input.verification.classification) {
      case "landed":
        // Direct-ui-source-edits have file-level verification only — no structural
        // AppSpec diff to confirm request fulfillment. Report partial.
        return {
          status: isDirectUiEdit ? "partial" : "succeeded",
          detail: isDirectUiEdit
            ? "Files landed but visual fulfillment of the request was not verified."
            : input.verification.summary,
          evidence: isDirectUiEdit
            ? input.verification.verifiedLandedEdits.map(
                (e) => e.replace("Verified landed", "Applied"),
              )
            : input.verification.verifiedLandedEdits,
        };
      case "partial":
        return {
          status: "partial",
          detail: input.verification.summary,
          evidence: input.verification.verifiedLandedEdits,
        };
      case "not_landed":
        return {
          status: "failed",
          detail: input.verification.summary,
          evidence: [],
        };
      case "inconclusive":
        return {
          status: "partial",
          detail: input.verification.summary,
          evidence: input.verification.verifiedLandedEdits,
        };
    }
  }

  // Create mode — no file-level verification, only runtime health
  if (input.mode === "create") {
    const session = input.restartedRuntimeSession;

    if (session?.status === "running") {
      return {
        status: "partial",
        detail: "No file-level content verification was performed for the initial workspace.",
        evidence: ["Runtime container started and responded to health check."],
      };
    }

    return {
      status: "failed",
      detail: session?.failure?.message ?? "Runtime did not start successfully.",
      evidence: [],
    };
  }

  // Edit mode without code verification — infer from apply result
  if (input.updateResult?.workspaceChangesApplied && input.updateResult.appliedPaths.length > 0) {
    const session = input.updateResult.session;
    if (session.status === "running" || session.status === "starting") {
      return {
        status: "partial",
        detail: "Files applied but no file-level content verification was performed.",
        evidence: [`Applied ${input.updateResult.appliedPaths.length} file(s) and runtime remained healthy.`],
      };
    }
  }

  return { status: "not_started", detail: null, evidence: [] };
}

export function deriveOperationStages(input: DeriveOperationStagesInput): OperationStages {
  return {
    generation: deriveGenerationStage(input),
    apply: deriveApplyStage(input),
    validation: deriveValidationStage(input),
    runtime: deriveRuntimeStage(input),
    verification: deriveVerificationStage(input),
  };
}
