import { createAssistantActivity, createUserClarificationAnswersActivity } from "@/lib/builder/activity/create-activity-item";
import type { BuilderActivityItem } from "@/lib/builder/activity/model";
import type { ClarificationQuestion } from "@/lib/planner/clarification/types";
import type { ClarificationAnswer } from "@/lib/planner/prompt-context";
import type { BrowserRuntimeErrorReport, RuntimeRepairAttempt, RuntimeSession } from "@/lib/runtime/service/dto";

export function createInitialBuilderActivity(): BuilderActivityItem {
  return createAssistantActivity({
    kind: "system-status",
    tone: "info",
    title: "Describe the app you want to build. I’ll turn it into a runnable preview and surface runtime activity here.",
    source: "builder",
    dedupeKey: "builder-intro",
  });
}

export function createGenerationStartedActivity(mode: "create" | "edit") {
  return createAssistantActivity({
    kind: "generation",
    tone: "info",
    title: mode === "edit" ? "Updating the app from your prompt." : "Generating the app from your prompt.",
    detail: "Planning, generation, and runtime setup will appear here as the workspace progresses.",
    source: "builder",
  });
}

export function createClarificationQuestionsActivity(summary: string, questions: ClarificationQuestion[]) {
  return createAssistantActivity({
    kind: "clarification-question",
    tone: "warning",
    title: "I need a little more detail before building.",
    detail: summary,
    questions,
    source: "builder",
  });
}

export function createClarificationAnswersActivity(answers: ClarificationAnswer[]) {
  return createUserClarificationAnswersActivity(answers);
}

export function createPlanningStartedActivity() {
  return createAssistantActivity({
    kind: "planning",
    tone: "info",
    title: "Planning the build-ready request.",
    detail: "Using the prompt and any clarification answers to shape the next project brief and generated app.",
    source: "builder",
  });
}

export function createGenerationCompletedActivity(options: {
  mode: "create" | "edit";
  usedFallback: boolean;
  repaired: boolean;
}) {
  const title = options.mode === "edit" ? "App update completed." : "App generation completed.";
  const detail = options.usedFallback
    ? "Used the safe fallback app spec so the workspace stayed runnable."
    : options.repaired
      ? "Normalized the generated app spec to keep it within the contract."
      : "Generated a new app spec and passed it into the runtime flow.";

  return createAssistantActivity({
    kind: "generation",
    tone: options.usedFallback ? "warning" : "success",
    title,
    detail,
    source: "builder",
  });
}

export function createGenerationFailedActivity(message: string) {
  return createAssistantActivity({
    kind: "error",
    tone: "error",
    title: "App generation failed.",
    detail: message,
    source: "builder",
  });
}

export function createRuntimeActionActivity(action: "start" | "restart" | "stop") {
  const title =
    action === "restart" ? "Restarting the runtime preview." : action === "stop" ? "Stopping the runtime preview." : "Starting the runtime preview.";

  return createAssistantActivity({
    kind: "runtime",
    tone: "info",
    title,
    detail: "The builder will keep the preview and terminal in sync while the runtime changes state.",
    source: "runtime",
  });
}

export function createBrowserRuntimeErrorActivity(report: BrowserRuntimeErrorReport, runtimeId: string) {
  return createAssistantActivity({
    kind: "error",
    tone: "error",
    title: "Browser runtime error detected in the preview.",
    detail: report.message,
    source: "browser",
    relatedRuntimeId: runtimeId,
    dedupeKey: `${runtimeId}|browser-error|${report.source}|${report.message}`,
    timestamp: report.timestamp,
  });
}

export function createRepairStartedActivity(runtimeId: string, detail: string) {
  return createAssistantActivity({
    kind: "repair",
    tone: "warning",
    title: "Attempting a bounded repair of the generated app.",
    detail,
    source: "repair",
    relatedRuntimeId: runtimeId,
  });
}

export function createHotUpdateAppliedActivity(updatedPaths: string[]) {
  return createAssistantActivity({
    kind: "runtime",
    tone: "success",
    title: "Applied the update to the live workspace.",
    detail: updatedPaths.length
      ? `Updated ${updatedPaths.length} app-owned file${updatedPaths.length === 1 ? "" : "s"} in place and kept the runtime alive.`
      : "The live workspace was already aligned with the latest generated app files.",
    source: "runtime",
  });
}

export function createDevServerRestartedActivity(reason?: string) {
  return createAssistantActivity({
    kind: "runtime",
    tone: "warning",
    title: "Restarted the dev server inside the live container.",
    detail: reason ?? "Hot reload was not enough, so the runtime restarted the dev server without tearing down the container.",
    source: "runtime",
  });
}

export function createContainerRestartRequiredActivity(reason?: string) {
  return createAssistantActivity({
    kind: "runtime",
    tone: "warning",
    title: "A full container restart is required.",
    detail: reason ?? "The existing container could not safely absorb this update.",
    source: "runtime",
  });
}

export function createHotUpdateAttemptActivity() {
  return createAssistantActivity({
    kind: "runtime",
    tone: "info",
    title: "Applying the prompt update to the live workspace.",
    detail: "The runtime will stay up if the generated change set is hot-reload-safe.",
    source: "runtime",
  });
}

export function deriveRuntimeStatusActivities(previousSession: RuntimeSession | null, nextSession: RuntimeSession): BuilderActivityItem[] {
  if (previousSession?.runtimeId === nextSession.runtimeId && previousSession.status === nextSession.status) {
    return [];
  }

  const dedupeKey = `${nextSession.runtimeId}|status|${nextSession.status}`;
  const relatedRuntimeId = nextSession.runtimeId;

  switch (nextSession.status) {
    case "preparing":
      return [
        createAssistantActivity({
          kind: "runtime",
          tone: "info",
          title: "Preparing the runtime workspace.",
          detail: "Installing dependencies and building the local preview container.",
          source: "runtime",
          relatedRuntimeId,
          dedupeKey,
        }),
      ];
    case "starting":
      return [
        createAssistantActivity({
          kind: "runtime",
          tone: "info",
          title: "Starting the runtime preview.",
          detail: "Waiting for the generated app to become reachable.",
          source: "runtime",
          relatedRuntimeId,
          dedupeKey,
        }),
      ];
    case "running":
      return [
        createAssistantActivity({
          kind: "runtime",
          tone: "success",
          title: "Runtime is running and the preview is live.",
          detail: nextSession.previewUrl ? `Preview available at ${nextSession.previewUrl}.` : undefined,
          source: "runtime",
          relatedRuntimeId,
          dedupeKey,
        }),
      ];
    case "failed":
      return [
        createAssistantActivity({
          kind: "error",
          tone: "error",
          title: "Runtime failed.",
          detail: nextSession.failure?.message ?? "The runtime reported a failure.",
          source: nextSession.failure?.code === "client_runtime_failed" ? "browser" : "runtime",
          relatedRuntimeId,
          dedupeKey,
        }),
      ];
    case "stopped":
      return [
        createAssistantActivity({
          kind: "runtime",
          tone: "warning",
          title: "Runtime stopped.",
          detail: "The live preview is no longer running.",
          source: "runtime",
          relatedRuntimeId,
          dedupeKey,
        }),
      ];
    default:
      return [];
  }
}

export function deriveRepairAttemptActivities(repairAttempts: RuntimeRepairAttempt[], seenAttemptIds: Set<string>): BuilderActivityItem[] {
  const items: BuilderActivityItem[] = [];

  for (const attempt of repairAttempts) {
    if (seenAttemptIds.has(attempt.attemptId)) {
      continue;
    }

    seenAttemptIds.add(attempt.attemptId);

    items.push(
      createAssistantActivity({
        kind: "repair",
        tone: toRepairTone(attempt),
        title: toRepairTitle(attempt),
        detail: attempt.diagnosticSummary || attempt.logExcerpt,
        source: attempt.failureKind === "runtime" ? "repair" : "runtime",
        relatedRuntimeId: attempt.runtimeId,
        dedupeKey: `repair|${attempt.attemptId}`,
        timestamp: attempt.finishedAt,
      }),
    );
  }

  return items;
}

function toRepairTone(attempt: RuntimeRepairAttempt) {
  switch (attempt.status) {
    case "fixed":
      return "success" as const;
    case "aborted":
      return "warning" as const;
    default:
      return "error" as const;
  }
}

function toRepairTitle(attempt: RuntimeRepairAttempt) {
  switch (attempt.status) {
    case "fixed":
      return "Bounded auto-fix succeeded and the preview recovered.";
    case "aborted":
      return "Auto-fix aborted after repeated or unsupported failure.";
    default:
      return "Auto-fix attempt failed.";
  }
}
