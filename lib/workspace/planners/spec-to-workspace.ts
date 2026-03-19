import type { AppSpec } from "@/lib/domain/app-spec";
import { runWorkspaceOrchestratorApplication } from "@/lib/applications/orchestrator/main";
import type { ProjectBuildMemory } from "@/lib/project-memory/schema";
import type { WorkspacePlan } from "@/lib/workspace/model";

export async function specToWorkspacePlan(
  spec: AppSpec,
  projectId: string,
  projectMemory?: ProjectBuildMemory,
): Promise<WorkspacePlan> {
  return runWorkspaceOrchestratorApplication({
    projectId,
    appSpec: spec,
    mode: "generate",
    projectMemory,
  }, {
    fallback: "template",
  });
}
