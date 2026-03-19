import { z } from "zod";

import { type AppSpec, builderModeSchema } from "@/lib/domain/app-spec";
import { normalizePrompt } from "@/lib/domain/app-spec/parse";
import type { ProjectBuildMemory } from "@/lib/project-memory/schema";

export const clarificationAnswerSchema = z.object({
  questionId: z.string().min(1),
  label: z.string().min(1),
  answer: z.string().trim().min(1),
});

export const promptContextEnvelopeSchema = z.object({
  prompt: z.string().trim().min(1),
  mode: builderModeSchema.default("create"),
  clarificationAnswers: z.array(clarificationAnswerSchema).max(3).default([]),
  projectMemorySummary: z.string().trim().optional(),
  activeDecisions: z.array(z.string().trim().min(1)).max(8).default([]),
  activeConstraints: z.array(z.string().trim().min(1)).max(8).default([]),
  currentSpecSummary: z.string().trim().optional(),
});

export type ClarificationAnswer = z.infer<typeof clarificationAnswerSchema>;
export type PromptContextEnvelope = z.infer<typeof promptContextEnvelopeSchema>;

export function buildPromptContextEnvelope(input: {
  prompt: string;
  mode?: "create" | "edit";
  clarificationAnswers?: ClarificationAnswer[];
  projectMemory?: ProjectBuildMemory;
  currentSpec?: AppSpec;
}): PromptContextEnvelope {
  return promptContextEnvelopeSchema.parse({
    prompt: normalizePrompt(input.prompt),
    mode: input.mode ?? "create",
    clarificationAnswers: input.clarificationAnswers ?? [],
    projectMemorySummary: input.projectMemory?.llmContextSummary || undefined,
    activeDecisions: input.projectMemory?.decisions.slice(-6).map((decision) => decision.summary) ?? [],
    activeConstraints: input.projectMemory?.constraints.slice(-6).map((constraint) => constraint.text) ?? [],
    currentSpecSummary: input.currentSpec ? summarizeCurrentSpec(input.currentSpec) : undefined,
  });
}

export function formatPromptContextForLlm(context: PromptContextEnvelope) {
  const sections = [`Original prompt: ${context.prompt}`];
  const clarificationAnswers = context.clarificationAnswers ?? [];
  const activeDecisions = context.activeDecisions ?? [];
  const activeConstraints = context.activeConstraints ?? [];

  if (clarificationAnswers.length) {
    sections.push(
      [
        "Clarification answers:",
        ...clarificationAnswers.map((answer) => `- ${answer.label}: ${answer.answer}`),
      ].join("\n"),
    );
  }

  if (context.projectMemorySummary) {
    sections.push(`Project memory:\n${context.projectMemorySummary}`);
  }

  if (activeDecisions.length) {
    sections.push(
      [
        "Active decisions:",
        ...activeDecisions.map((decision) => `- ${decision}`),
      ].join("\n"),
    );
  }

  if (activeConstraints.length) {
    sections.push(
      [
        "Active constraints:",
        ...activeConstraints.map((constraint) => `- ${constraint}`),
      ].join("\n"),
    );
  }

  if (context.currentSpecSummary) {
    sections.push(`Current app context:\n${context.currentSpecSummary}`);
  }

  return sections.join("\n\n");
}

function summarizeCurrentSpec(spec: AppSpec) {
  const pages = spec.pages.map((page) => page.title).join(", ");

  return [
    `Title: ${spec.title}`,
    pages ? `Pages: ${pages}` : null,
  ].filter(Boolean).join("\n");
}
