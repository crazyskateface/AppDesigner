import { normalizePrompt } from "@/lib/domain/app-spec/parse";
import type { AppSpec, BuilderMode } from "@/lib/domain/app-spec";
import type { GroundedBuildResult } from "@/lib/builder/result/schema";
import type { RuntimeRepairAttempt } from "@/lib/runtime/service/dto";

import {
  projectBuildMemorySchema,
  type ProjectBuildMemory,
  type ProjectMemoryChange,
} from "@/lib/project-memory/schema";
import {
  buildProjectMemoryLlmSummary,
  summarizeAppSpecForProjectMemory,
} from "@/lib/project-memory/summarize";
import type { ClarificationAnswer } from "@/lib/planner/prompt-context";

type ProjectMemoryUpdateResult = {
  memory: ProjectBuildMemory;
  changes: ProjectMemoryChange[];
};

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function limitTo<T>(items: T[], size: number) {
  return items.slice(-size);
}

function dedupeByText<T extends { summary?: string; text?: string }>(items: T[]) {
  const seen = new Set<string>();
  const next: T[] = [];

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    const key = item.summary ?? item.text ?? "";

    if (!key || seen.has(key.toLowerCase())) {
      continue;
    }

    seen.add(key.toLowerCase());
    next.unshift(item);
  }

  return next;
}

function extractConstraintClauses(input: string) {
  return input
    .split(/[\n.!?]+/)
    .map((clause) => clause.trim())
    .filter((clause) => /\b(do not|don't|avoid|keep|only|no )\b/i.test(clause))
    .map((clause) => clause.replace(/\s+/g, " "))
    .filter((clause) => clause.length >= 8 && clause.length <= 160)
    .slice(0, 4);
}

function finalizeMemory(memory: ProjectBuildMemory, changes: ProjectMemoryChange[]): ProjectMemoryUpdateResult {
  const nextMemory = projectBuildMemorySchema.parse({
    ...memory,
    llmContextSummary: buildProjectMemoryLlmSummary(memory),
  });

  return {
    memory: nextMemory,
    changes,
  };
}

export function createEmptyProjectBuildMemory(projectId: string): ProjectBuildMemory {
  return projectBuildMemorySchema.parse({
    projectId,
    updatedAt: nowIso(),
    currentDirection: {
      summary: "",
      mode: "create",
    },
  });
}

export function ensureProjectBuildMemory(projectId: string, memory?: ProjectBuildMemory | null) {
  if (!memory) {
    return createEmptyProjectBuildMemory(projectId);
  }

  return projectBuildMemorySchema.parse({
    ...memory,
    projectId,
  });
}

export function rememberPromptSubmission(
  memory: ProjectBuildMemory,
  input: {
    prompt: string;
    mode: BuilderMode;
    timestamp?: string;
  },
): ProjectMemoryUpdateResult {
  const timestamp = input.timestamp ?? nowIso();
  const prompt = normalizePrompt(input.prompt);
  const extractedConstraints = extractConstraintClauses(prompt);

  return finalizeMemory(
    {
      ...memory,
      updatedAt: timestamp,
      currentDirection: {
        summary: prompt,
        mode: input.mode,
      },
      recentPrompts: limitTo(
        [
          ...memory.recentPrompts,
          {
            id: createId(),
            prompt,
            mode: input.mode,
            createdAt: timestamp,
          },
        ],
        5,
      ),
      constraints: limitTo(
        dedupeByText([
          ...memory.constraints,
          ...extractedConstraints.map((text) => ({
            id: createId(),
            text,
            source: "prompt" as const,
            createdAt: timestamp,
          })),
        ]),
        12,
      ),
    },
    [
      {
        kind: "prompt",
        summary: `Remembered a ${input.mode} prompt.`,
        detail: prompt,
      },
      ...extractedConstraints.map((constraint) => ({
        kind: "constraint" as const,
        summary: `Captured prompt constraint: ${constraint}`,
      })),
    ],
  );
}

export function rememberClarificationAnswers(
  memory: ProjectBuildMemory,
  input: {
    prompt: string;
    answers: ClarificationAnswer[];
    timestamp?: string;
  },
): ProjectMemoryUpdateResult {
  const timestamp = input.timestamp ?? nowIso();
  const prompt = normalizePrompt(input.prompt);
  const decisionEntries = input.answers.map((answer) => ({
    id: createId(),
    summary: `${answer.label}: ${answer.answer}`,
    source: "clarification" as const,
    createdAt: timestamp,
  }));
  const extractedConstraints = input.answers.flatMap((answer) => extractConstraintClauses(answer.answer));

  return finalizeMemory(
    {
      ...memory,
      updatedAt: timestamp,
      clarifications: limitTo(
        [
          ...memory.clarifications,
          {
            id: createId(),
            prompt,
            answers: input.answers.map((answer) => ({
              questionId: answer.questionId,
              label: answer.label,
              answer: answer.answer,
            })),
            createdAt: timestamp,
          },
        ],
        3,
      ),
      decisions: limitTo(dedupeByText([...memory.decisions, ...decisionEntries]), 12),
      constraints: limitTo(
        dedupeByText([
          ...memory.constraints,
          ...extractedConstraints.map((text) => ({
            id: createId(),
            text,
            source: "clarification" as const,
            createdAt: timestamp,
          })),
        ]),
        12,
      ),
    },
    [
      {
        kind: "clarification",
        summary: "Remembered a clarification answer batch.",
        detail: input.answers.map((answer) => `${answer.label}: ${answer.answer}`).join(" | "),
      },
      ...decisionEntries.map((decision) => ({
        kind: "decision" as const,
        summary: decision.summary,
      })),
      ...extractedConstraints.map((constraint) => ({
        kind: "constraint" as const,
        summary: `Captured clarification constraint: ${constraint}`,
      })),
    ],
  );
}

export function rememberGenerationSuccess(
  memory: ProjectBuildMemory,
  input: {
    prompt: string;
    mode: BuilderMode;
    appSpec: AppSpec;
    timestamp?: string;
  },
): ProjectMemoryUpdateResult {
  const timestamp = input.timestamp ?? nowIso();
  const projectState = summarizeAppSpecForProjectMemory(input.appSpec);
  const summary =
    input.mode === "edit"
      ? `Updated the app to ${input.appSpec.title}.`
      : `Generated ${input.appSpec.title}.`;

  return finalizeMemory(
    {
      ...memory,
      updatedAt: timestamp,
      currentDirection: {
        summary: normalizePrompt(input.prompt),
        mode: input.mode,
      },
      projectState: {
        ...memory.projectState,
        ...projectState,
      },
      recentOutcomes: limitTo(
        [
          ...memory.recentOutcomes,
          {
            id: createId(),
            kind: "generation-succeeded",
            summary,
            createdAt: timestamp,
          },
        ],
        8,
      ),
    },
    [
      {
        kind: "project-state",
        summary: `Updated project state for ${input.appSpec.title}.`,
      },
      {
        kind: "outcome",
        summary,
      },
    ],
  );
}

export function rememberGroundedBuildResult(
  memory: ProjectBuildMemory,
  input: {
    result: GroundedBuildResult;
    timestamp?: string;
  },
): ProjectMemoryUpdateResult {
  const timestamp = input.timestamp ?? nowIso();
  const durableDecisionEntries = input.result.memory.durableFacts.map((summary) => ({
    id: createId(),
    summary,
    source: "generation" as const,
    createdAt: timestamp,
  }));
  const nextProjectState =
    input.result.memory.updateProjectState && input.result.attempt.nextSpec
      ? summarizeAppSpecForProjectMemory(input.result.attempt.nextSpec)
      : memory.projectState;
  const outcomeKind =
    input.result.classification === "verified_success" || input.result.classification === "partial_success"
      ? "generation-succeeded"
      : input.result.verification?.classification === "landed" || input.result.verification?.classification === "partial"
        ? "generation-succeeded"
        : "generation-failed";

  return finalizeMemory(
    {
      ...memory,
      updatedAt: timestamp,
      currentDirection: {
        summary: normalizePrompt(input.result.userPrompt),
        mode: input.result.mode,
      },
      projectState: {
        ...nextProjectState,
        runtimeStatus:
          input.result.runtime.status === "skipped" ? memory.projectState.runtimeStatus : input.result.runtime.status,
        lastFailure:
          input.result.classification === "runtime_failed" || input.result.classification === "apply_failed"
            ? input.result.runtime.diagnosticSummary ?? input.result.runtime.reason ?? input.result.memory.outcomeSummary
            : null,
      },
      decisions: limitTo(dedupeByText([...memory.decisions, ...durableDecisionEntries]), 12),
      recentOutcomes: limitTo(
        [
          ...memory.recentOutcomes,
          {
            id: input.result.turnId,
            kind: outcomeKind,
            summary: input.result.memory.outcomeSummary,
            createdAt: timestamp,
          },
        ],
        8,
      ),
    },
    [
      ...(input.result.memory.updateProjectState
        ? [
            {
              kind: "project-state" as const,
              summary: `Updated project state for ${input.result.attempt.nextSpec?.title ?? "the app"}.`,
            },
          ]
        : []),
      ...durableDecisionEntries.map((decision) => ({
        kind: "decision" as const,
        summary: decision.summary,
      })),
      {
        kind: "outcome" as const,
        summary: input.result.memory.outcomeSummary,
      },
    ],
  );
}

export function rememberGenerationFailure(
  memory: ProjectBuildMemory,
  input: {
    mode: BuilderMode;
    message: string;
    timestamp?: string;
  },
): ProjectMemoryUpdateResult {
  const timestamp = input.timestamp ?? nowIso();
  const summary =
    input.mode === "edit"
      ? `App update failed: ${input.message}`
      : `App generation failed: ${input.message}`;

  return finalizeMemory(
    {
      ...memory,
      updatedAt: timestamp,
      recentOutcomes: limitTo(
        [
          ...memory.recentOutcomes,
          {
            id: createId(),
            kind: "generation-failed",
            summary,
            createdAt: timestamp,
          },
        ],
        8,
      ),
    },
    [
      {
        kind: "outcome",
        summary,
      },
    ],
  );
}

export function rememberRepairAttemptOutcome(
  memory: ProjectBuildMemory,
  attempt: RuntimeRepairAttempt,
): ProjectMemoryUpdateResult {
  const existingAttempt = memory.recentOutcomes.some((outcome) => outcome.id === attempt.attemptId);

  if (existingAttempt) {
    return finalizeMemory(memory, []);
  }

  const kind =
    attempt.status === "fixed"
      ? attempt.failureKind === "runtime"
        ? "runtime-recovered"
        : "repair-fixed"
      : attempt.status === "aborted"
        ? "repair-aborted"
        : "repair-failed";

  const summary =
    attempt.status === "fixed"
      ? `Repair succeeded: ${attempt.diagnosticSummary}`
      : attempt.status === "aborted"
        ? `Repair aborted: ${attempt.diagnosticSummary}`
        : `Repair failed: ${attempt.diagnosticSummary}`;

  return finalizeMemory(
    {
      ...memory,
      updatedAt: attempt.finishedAt,
      recentOutcomes: limitTo(
        [
          ...memory.recentOutcomes,
          {
            id: attempt.attemptId,
            kind,
            summary,
            createdAt: attempt.finishedAt,
          },
        ],
        8,
      ),
    },
    [
      {
        kind: "outcome",
        summary,
      },
    ],
  );
}
