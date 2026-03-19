import type { WorkspaceTargetKind } from "@/lib/workspace/model";

export type OrchestratorApplicationConfig = {
  defaultTargetKind: WorkspaceTargetKind;
  defaultStrategy: "environment-actions";
};

export const orchestratorApplicationConfig: OrchestratorApplicationConfig = {
  defaultTargetKind: "vite-react-static",
  defaultStrategy: "environment-actions",
};
