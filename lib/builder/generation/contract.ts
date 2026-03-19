import { z } from "zod";

import { appSpecGenerationMetaSchema, appSpecSchema, builderModeSchema } from "@/lib/domain/app-spec";
import { workspaceFileSchema } from "@/lib/workspace/schemas";
import { clarificationDecisionSchema, clarificationQuestionSchema } from "@/lib/planner/clarification/types";
import { clarificationAnswerSchema } from "@/lib/planner/prompt-context";
import { projectBuildMemorySchema } from "@/lib/project-memory/schema";

export const builderGenerateRequestSchema = z
  .object({
    prompt: z.string().trim().min(20, "Prompt must be at least 20 characters long."),
    mode: builderModeSchema.default("create"),
    currentSpec: appSpecSchema.optional(),
    runtimeId: z.string().trim().min(1).optional(),
    clarificationAnswers: z.array(clarificationAnswerSchema).max(3).default([]),
    projectMemory: projectBuildMemorySchema.optional(),
  })
  .superRefine((request, ctx) => {
    if (request.mode === "edit" && !request.currentSpec) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Edit mode requires a current app spec.",
        path: ["currentSpec"],
      });
    }
  });

export const clarificationRequiredResponseSchema = z.object({
  status: z.literal("clarification_required"),
  assistantMessage: z.string().min(1),
  clarification: clarificationDecisionSchema.extend({
    decision: z.literal("ask-clarify"),
    questions: z.array(clarificationQuestionSchema).min(1).max(3),
  }),
});

export const generationReadyResponseSchema = z.object({
  status: z.literal("generation_ready"),
  assistantMessage: z.string().min(1),
  changeStatus: z.enum(["changed", "unchanged"]).default("changed"),
  appSpec: appSpecSchema,
  generationMeta: appSpecGenerationMetaSchema,
  directEdit: z
    .object({
      strategy: z.literal("direct-ui-source-edit"),
      summary: z.string().min(1),
      files: z.array(workspaceFileSchema).min(1).max(12),
      notes: z.array(z.string().min(1)).max(8).default([]),
    })
    .optional(),
});

export const builderGenerateResponseSchema = z.union([
  clarificationRequiredResponseSchema,
  generationReadyResponseSchema,
]);

export type BuilderGenerateRequest = z.infer<typeof builderGenerateRequestSchema>;
export type ClarificationRequiredResponse = z.infer<typeof clarificationRequiredResponseSchema>;
export type GenerationReadyResponse = z.infer<typeof generationReadyResponseSchema>;
export type BuilderGenerateResponse = z.infer<typeof builderGenerateResponseSchema>;
