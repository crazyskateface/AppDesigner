import type { ClarificationQuestion } from "@/lib/planner/clarification/types";
import type { ClarificationAnswer } from "@/lib/planner/prompt-context";
import type {
  BuilderActivityItem,
  BuilderActivityKind,
  BuilderActivityRole,
  BuilderActivitySource,
  BuilderActivityTone,
} from "@/lib/builder/activity/model";

export function createBuilderActivityItem(input: {
  role: BuilderActivityRole;
  kind: BuilderActivityKind;
  tone: BuilderActivityTone;
  title: string;
  detail?: string;
  source: BuilderActivitySource;
  relatedRuntimeId?: string;
  dedupeKey?: string;
  timestamp?: string;
  questions?: ClarificationQuestion[];
  answers?: ClarificationAnswer[];
}): BuilderActivityItem {
  return {
    id: createActivityId(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    role: input.role,
    kind: input.kind,
    tone: input.tone,
    title: input.title,
    detail: input.detail,
    source: input.source,
    relatedRuntimeId: input.relatedRuntimeId,
    dedupeKey: input.dedupeKey,
    questions: input.questions,
    answers: input.answers,
  };
}

export function createUserPromptActivity(prompt: string) {
  return createBuilderActivityItem({
    role: "user",
    kind: "user-prompt",
    tone: "info",
    title: prompt,
    source: "builder",
  });
}

export function createUserClarificationAnswersActivity(answers: ClarificationAnswer[]) {
  return createBuilderActivityItem({
    role: "user",
    kind: "clarification-answer",
    tone: "info",
    title: "Provided clarification answers.",
    detail: "Added the missing detail the builder asked for.",
    answers,
    source: "builder",
  });
}

export function createAssistantActivity(input: {
  kind: BuilderActivityKind;
  tone: BuilderActivityTone;
  title: string;
  detail?: string;
  source: BuilderActivitySource;
  relatedRuntimeId?: string;
  dedupeKey?: string;
  timestamp?: string;
  questions?: ClarificationQuestion[];
  answers?: ClarificationAnswer[];
}) {
  return createBuilderActivityItem({
    role: "assistant",
    ...input,
  });
}

export function createAssistantResponseActivity(message: string, tone: BuilderActivityTone = "info") {
  return createBuilderActivityItem({
    role: "assistant",
    kind: "assistant-response",
    tone,
    title: message,
    source: "builder",
  });
}

function createActivityId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
