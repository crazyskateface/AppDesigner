import { orchestratorApplicationConfig } from "@/lib/applications/orchestrator/app-config";
import { createCompletedStage, type OrchestratorStageEvent } from "@/lib/applications/orchestrator/stages";
import { loadOrchestratorApplicationContext } from "@/lib/applications/orchestrator/context-loader";
import { runOrchestratorSteps } from "@/lib/applications/orchestrator/step-runner";
import type { OrchestratorMode } from "@/lib/applications/orchestrator/modes";
import type { AppSpec } from "@/lib/domain/app-spec";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { generateProjectBriefFromPrompt } from "@/lib/planner/project-brief-generator";
import type { ProjectBrief } from "@/lib/planner/project-brief";
import type { PromptContextEnvelope } from "@/lib/planner/prompt-context";
import type { ProjectBuildMemory } from "@/lib/project-memory/schema";
import type { WorkspacePlan } from "@/lib/workspace/model";
import type { RuntimeInspectionSnapshot } from "@/lib/applications/orchestrator/actions/schema";

export async function runWorkspaceOrchestratorApplication(
  input: {
    projectId: string;
    appSpec: AppSpec;
    mode?: OrchestratorMode;
    projectMemory?: ProjectBuildMemory;
    runtimeInspection?: RuntimeInspectionSnapshot;
  },
  options: {
    provider?: StructuredObjectGenerator;
    fallback?: "none" | "template";
    controlDevServer?: (runtimeId: string, requestedStrategy: "hot-update" | "dev-server-restart" | "full-runtime-restart-required") => Promise<{
      strategyUsed: "hot-update" | "dev-server-restart" | "full-runtime-restart-required";
      summary: string;
    }>;
  } = {},
): Promise<WorkspacePlan> {
  const context = loadOrchestratorApplicationContext({
    ...input,
    mode: input.mode ?? "generate",
  });

  if (orchestratorApplicationConfig.defaultStrategy !== "environment-actions") {
    throw new Error("Unsupported orchestrator strategy.");
  }

  return runOrchestratorSteps(context, {
    provider: options.provider,
    fallback: options.fallback ?? "none",
    controlDevServer: options.controlDevServer,
  });
}

export async function planProjectFromPrompt(
  prompt: string | PromptContextEnvelope,
  options: {
    provider?: StructuredObjectGenerator;
  } = {},
): Promise<{
  projectBrief: ProjectBrief;
  workflow: {
    mode: "plan";
    stages: OrchestratorStageEvent[];
  };
}> {
  const result = await generateProjectBriefFromPrompt(prompt, {
    provider: options.provider,
  });

  return {
    projectBrief: result.projectBrief,
    workflow: {
      mode: "plan",
      stages: [
        createCompletedStage("intake", "Accepted prompt for orchestrator planning."),
        createCompletedStage("plan", "Generated a ProjectBrief from the prompt.", result.generationMeta.provider),
      ],
    },
  };
}
