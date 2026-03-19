import type { AppSpec } from "@/lib/domain/app-spec";
import type { OrchestratorMode } from "@/lib/applications/orchestrator/modes";
import { createProjectBriefFromAppSpec } from "@/lib/planner/app-spec-to-project-brief";
import type { ProjectBrief } from "@/lib/planner/project-brief";
import type { ProjectBuildMemory } from "@/lib/project-memory/schema";
import type { RuntimeInspectionSnapshot } from "@/lib/applications/orchestrator/actions/schema";

export type OrchestratorApplicationContext = {
  mode: OrchestratorMode;
  projectId: string;
  prompt: string;
  appSpec: AppSpec;
  projectBrief: ProjectBrief;
  projectMemory?: ProjectBuildMemory;
  runtimeInspection?: RuntimeInspectionSnapshot;
};

export function loadOrchestratorApplicationContext(input: {
  projectId: string;
  appSpec: AppSpec;
  mode?: OrchestratorMode;
  projectMemory?: ProjectBuildMemory;
  runtimeInspection?: RuntimeInspectionSnapshot;
}): OrchestratorApplicationContext {
  return {
    mode: input.mode ?? "generate",
    projectId: input.projectId,
    prompt: input.appSpec.prompt,
    appSpec: input.appSpec,
    projectBrief: createProjectBriefFromAppSpec(input.appSpec),
    projectMemory: input.projectMemory,
    runtimeInspection: input.runtimeInspection,
  };
}
