import type { RuntimeTarget } from "@/lib/runtime/contracts";

export function getDockerImageTag(target: RuntimeTarget) {
  return `appdesigner-${target.projectId}-${target.workspaceId}`.toLowerCase();
}

export function getDockerContainerName(target: RuntimeTarget) {
  return `appdesigner-${target.projectId}-${target.workspaceId}-run`.toLowerCase();
}
