import type { ClarificationQuestion } from "@/lib/planner/clarification/types";
import type { ClarificationAnswer } from "@/lib/planner/prompt-context";

export type BuilderActivityRole = "assistant" | "user";

export type BuilderActivityKind =
  | "user-prompt"
  | "assistant-response"
  | "system-status"
  | "generation"
  | "planning"
  | "clarification-question"
  | "clarification-answer"
  | "runtime"
  | "error"
  | "repair";

export type BuilderActivityTone = "info" | "success" | "warning" | "error";

export type BuilderActivitySource = "builder" | "runtime" | "browser" | "repair";

export type BuilderActivityItem = {
  id: string;
  timestamp: string;
  role: BuilderActivityRole;
  kind: BuilderActivityKind;
  tone: BuilderActivityTone;
  title: string;
  detail?: string;
  source: BuilderActivitySource;
  relatedRuntimeId?: string;
  dedupeKey?: string;
  questions?: ClarificationQuestion[];
  answers?: ClarificationAnswer[];
};
