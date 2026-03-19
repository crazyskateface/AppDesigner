import { z } from "zod";

export const clarificationDecisionValueSchema = z.enum(["build-now", "ask-clarify"]);

export const clarificationQuestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  required: z.boolean().default(true),
});

export const clarificationDecisionSchema = z.object({
  decision: clarificationDecisionValueSchema,
  summary: z.string().min(1),
  questions: z.array(clarificationQuestionSchema).max(3).default([]),
});

export type ClarificationQuestion = z.infer<typeof clarificationQuestionSchema>;
export type ClarificationDecision = z.infer<typeof clarificationDecisionSchema>;
