import path from "node:path";

import type { GeneratedFileSet } from "@/lib/codegen/model";
import type { ProjectBrief } from "@/lib/planner/project-brief";
import type { ProjectBuildMemory } from "@/lib/project-memory/schema";
import type { WorkspacePlan } from "@/lib/workspace/model";

export function generatedFileSetToWorkspacePlan(
  fileSet: GeneratedFileSet,
  projectId: string,
  sourceSpecId: string,
  projectBrief: ProjectBrief,
  projectMemory?: ProjectBuildMemory,
): WorkspacePlan {
  const workspaceId = `workspace-${sourceSpecId}-${fileSet.metadata.sourceId}`.toLowerCase();

  return {
    projectId,
    workspaceId,
    sourceSpecId,
    targetKind: fileSet.targetKind,
    title: fileSet.title,
    relativeRootPath: path.join(".generated-workspaces", projectId, workspaceId),
    manifest: fileSet.manifest,
    files: fileSet.files,
    generationContext: {
      projectBrief,
      fileSetMetadata: fileSet.metadata,
      projectMemory,
    },
  };
}
