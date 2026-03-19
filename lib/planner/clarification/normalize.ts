import { clarificationDecisionSchema, type ClarificationDecision, type ClarificationQuestion } from "@/lib/planner/clarification/types";
import type { PromptContextEnvelope } from "@/lib/planner/prompt-context";

type ClarificationDecisionCandidate = Partial<ClarificationDecision> & {
  questions?: unknown;
};

export function normalizeClarificationDecisionCandidate(
  candidate: unknown,
  context: PromptContextEnvelope,
): ClarificationDecisionCandidate {
  const objectCandidate =
    candidate && typeof candidate === "object" && !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)
      : {};

  const decision = objectCandidate.decision === "ask-clarify" ? "ask-clarify" : "build-now";
  const questions = normalizeQuestions(objectCandidate.questions);

  return {
    decision: questions.length ? "ask-clarify" : decision,
    summary:
      typeof objectCandidate.summary === "string" && objectCandidate.summary.trim().length
        ? objectCandidate.summary.trim()
        : defaultSummary(context, questions.length > 0),
    questions: questions.length ? questions : [],
  };
}

export function validateClarificationDecisionCandidate(candidate: unknown) {
  return clarificationDecisionSchema.safeParse(candidate);
}

function normalizeQuestions(value: unknown): ClarificationQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 3)
    .map((question, index) => normalizeQuestion(question, index))
    .filter((question): question is ClarificationQuestion => Boolean(question));
}

function normalizeQuestion(value: unknown, index: number): ClarificationQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const label = typeof candidate.label === "string" ? candidate.label.trim() : "";

  if (!label) {
    return null;
  }

  return {
    id:
      typeof candidate.id === "string" && candidate.id.trim().length
        ? candidate.id.trim()
        : `clarification-${index + 1}`,
    label,
    placeholder:
      typeof candidate.placeholder === "string" && candidate.placeholder.trim().length
        ? candidate.placeholder.trim()
        : "Enter a short answer",
    reason:
      typeof candidate.reason === "string" && candidate.reason.trim().length
        ? candidate.reason.trim()
        : undefined,
    required: candidate.required !== false,
  };
}

function defaultSummary(context: PromptContextEnvelope, isClarifying: boolean) {
  if (isClarifying) {
    return context.clarificationAnswers.length
      ? "The answers still leave a key planning gap, so one clarification batch is required before building."
      : "The prompt needs a small amount of clarification before the builder can plan a credible first version.";
  }

  return "The request contains enough product shape, audience, and workflow detail to proceed into planning.";
}
