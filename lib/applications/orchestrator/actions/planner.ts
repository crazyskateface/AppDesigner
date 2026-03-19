import type { OrchestratorApplicationContext } from "@/lib/applications/orchestrator/context-loader";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { createViteReactManifest } from "@/lib/workspace/templates/vite-react";

import {
  orchestratorActionPlanSchema,
  type OrchestratorActionPlan,
} from "@/lib/applications/orchestrator/actions/schema";

function createActionId(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function planOrchestratorActions(
  context: OrchestratorApplicationContext,
  options: {
    provider?: StructuredObjectGenerator;
    fallback?: "none" | "template";
  } = {},
): Promise<OrchestratorActionPlan> {
  void options;
  const manifest = createViteReactManifest();
  const actions: OrchestratorActionPlan["actions"] = [];

  if (context.mode === "self-heal" && context.runtimeInspection) {
    actions.push({
      id: createActionId("runtime-inspect"),
      kind: "runtime.inspect",
      reason: "Collect structured runtime evidence before deciding the next bounded environment step.",
      executionPolicy: "execute",
      safety: {
        maxLogEntries: 20,
      },
      inputs: {
        requestedEvidence: ["runtime-status", "last-failure", "repair-attempts", "recent-logs", "browser-runtime-error"],
      },
    });

    if (context.runtimeInspection.status === "failed") {
      actions.push({
        id: createActionId("dev-server-control"),
        kind: "dev-server.control",
        reason: "Attempt a bounded dev-server restart when the runtime inspection shows a failed preview session.",
        executionPolicy: "execute",
        safety: {
          allowDirectExecution: true,
        },
        inputs: {
          requestedStrategy: "dev-server-restart",
        },
      });
    }
  }

  actions.push({
    id: createActionId("file-write-set"),
    kind: "file.write-set",
    reason:
      context.mode === "generate"
        ? "Generate the app-owned source files for the current project brief."
        : "Update the app-owned source files for the current project brief.",
    executionPolicy: "execute",
    safety: {
      allowedPathScope: "app-owned-source-only",
      maxFiles: 24,
    },
    inputs: {
      targetKind: "vite-react-static",
      projectBrief: context.projectBrief,
      manifest,
      fallback: "template",
    },
  });

  return orchestratorActionPlanSchema.parse({
    goal:
      context.mode === "generate"
        ? `Build the initial workspace for ${context.projectBrief.title}.`
        : `Apply the next bounded environment update for ${context.projectBrief.title}.`,
    mode: context.mode,
    actions,
    constraints: [
      "Only app-owned source files may be changed by executable file actions in this phase.",
      "Dependency/package actions may execute through a bounded package policy.",
      "Runtime process control must stay within the supported dev-server control surface.",
    ],
    requiresUserIntervention: false,
  });
}
