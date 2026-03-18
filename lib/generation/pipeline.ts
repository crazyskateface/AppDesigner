import { generateAppSpec, type AppSpec } from "@/lib/domain/app-spec";
import { materializedWorkspaceToRuntimeTarget } from "@/lib/runtime/adapters/workspace-to-runtime-target";
import { materializeWorkspaceToLocalFs } from "@/lib/workspace/materializers/local-fs";
import type { MaterializedWorkspace, WorkspacePlan } from "@/lib/workspace/model";
import { specToWorkspacePlan } from "@/lib/workspace/planners/spec-to-workspace";
import type { RuntimeTarget } from "@/lib/runtime/contracts";

export type GenerationPipeline = {
  generateSpec: (prompt: string) => AppSpec;
  planWorkspace: (spec: AppSpec, projectId: string) => WorkspacePlan;
  materializeWorkspace: (plan: WorkspacePlan) => Promise<MaterializedWorkspace>;
  createRuntimeTarget: (workspace: MaterializedWorkspace) => Promise<RuntimeTarget>;
};

export function createGenerationPipeline(): GenerationPipeline {
  return {
    generateSpec(prompt) {
      return generateAppSpec(prompt);
    },
    planWorkspace(spec, projectId) {
      return specToWorkspacePlan(spec, projectId);
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
