import path from "node:path";
import { createHash } from "node:crypto";

import type { AppSpec } from "@/lib/domain/app-spec";
import type { WorkspacePlan } from "@/lib/workspace/model";
import {
  createViteReactManifest,
  createViteReactWorkspaceFiles,
} from "@/lib/workspace/templates/vite-react";

function createWorkspaceId(spec: AppSpec) {
  const versionHash = createHash("sha1").update(JSON.stringify(spec)).digest("hex").slice(0, 8);
  return `workspace-${spec.appId}-${versionHash}`;
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
