import path from "node:path";

import type { AppSpec } from "@/lib/domain/app-spec";
import type { WorkspacePlan } from "@/lib/workspace/model";
import {
  createViteReactManifest,
  createViteReactWorkspaceFiles,
} from "@/lib/workspace/templates/vite-react";

function createWorkspaceId(spec: AppSpec) {
  return `workspace-${spec.appId}`;
}

export function specToWorkspacePlan(spec: AppSpec, projectId: string): WorkspacePlan {
  const manifest = createViteReactManifest();
  const workspaceId = createWorkspaceId(spec);

  return {
    projectId,
    workspaceId,
    sourceSpecId: spec.appId,
    targetKind: "vite-react-static",
    title: spec.title,
    relativeRootPath: path.join(".generated-workspaces", projectId, workspaceId),
    manifest,
    files: createViteReactWorkspaceFiles(spec, manifest),
  };
}
