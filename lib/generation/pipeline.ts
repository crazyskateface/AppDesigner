import type { AppSpec } from "@/lib/domain/app-spec";
import type { ProjectBuildMemory } from "@/lib/project-memory/schema";
import { materializedWorkspaceToRuntimeTarget } from "@/lib/runtime/adapters/workspace-to-runtime-target";
import { materializeWorkspaceToLocalFs } from "@/lib/workspace/materializers/local-fs";
import type { MaterializedWorkspace, WorkspacePlan } from "@/lib/workspace/model";
import { specToWorkspacePlan } from "@/lib/workspace/planners/spec-to-workspace";
import type { RuntimeTarget } from "@/lib/runtime/contracts";
import { generateAppSpecFromPrompt } from "@/lib/spec-pipeline/app-spec-generation-orchestrator";

export type GenerationPipeline = {
  generateSpec: (prompt: string) => Promise<AppSpec>;
  planWorkspace: (spec: AppSpec, projectId: string, projectMemory?: ProjectBuildMemory) => Promise<WorkspacePlan>;
  materializeWorkspace: (plan: WorkspacePlan) => Promise<MaterializedWorkspace>;
  createRuntimeTarget: (workspace: MaterializedWorkspace) => Promise<RuntimeTarget>;
};

export function createGenerationPipeline(): GenerationPipeline {
  return {
    async generateSpec(prompt) {
      const result = await generateAppSpecFromPrompt(prompt);
      return result.appSpec;
    },
    async planWorkspace(spec, projectId, projectMemory) {
      return specToWorkspacePlan(spec, projectId, projectMemory);
    },
    async materializeWorkspace(plan) {
      return materializeWorkspaceToLocalFs(plan);
    },
    async createRuntimeTarget(workspace) {
      return materializedWorkspaceToRuntimeTarget(workspace);
    },
  };
}

export const generationPipeline = createGenerationPipeline();
