import type { RuntimeFailure, RuntimeLogEntry } from "@/lib/runtime/logs";

export type RunnerStatus = "idle" | "preparing" | "starting" | "running" | "stopped" | "failed";

export type RuntimeTarget = {
  projectId: string;
  workspaceId: string;
  workspacePath: string;
  previewUrl: string;
  hostPort: number;
  containerPort: number;
};

export type RunnerHandle = {
  runId: string;
  target: RuntimeTarget;
};

export type RuntimeSnapshot = {
  status: RunnerStatus;
  previewUrl?: string;
  failure?: RuntimeFailure;
};

export interface Runner {
  prepare(target: RuntimeTarget): Promise<void>;
  start(target: RuntimeTarget): Promise<RunnerHandle>;
  restartDevServer(handle: RunnerHandle): Promise<void>;
  stop(handle: RunnerHandle): Promise<void>;
  getStatus(handle: RunnerHandle): Promise<RunnerStatus>;
  getLogs(handle: RunnerHandle): Promise<RuntimeLogEntry[]>;
  getPreparationLogs(target: RuntimeTarget): Promise<RuntimeLogEntry[]>;
}
