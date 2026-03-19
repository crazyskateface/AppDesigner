import type {
  BrowserRuntimeErrorReport,
  RuntimeLogPage,
  RuntimeSession,
  StartRuntimeInput,
  RuntimeUpdateResult,
  UpdateRuntimeInput,
} from "@/lib/runtime/service/dto";
import type { WorkspaceFile } from "@/lib/workspace/model";

export class RuntimeServiceNotFoundError extends Error {
  constructor(runtimeId: string) {
    super(`Runtime session "${runtimeId}" was not found.`);
    this.name = "RuntimeServiceNotFoundError";
  }
}

export interface RuntimeService {
  startProjectRuntime(input: StartRuntimeInput): Promise<RuntimeSession>;
  updateProjectRuntime(runtimeId: string, input: UpdateRuntimeInput): Promise<RuntimeUpdateResult>;
  getRuntimeSnapshot(runtimeId: string): Promise<RuntimeSession>;
  getRuntimeLogs(runtimeId: string): Promise<RuntimeLogPage>;
  getRuntimeWorkspaceFiles(runtimeId: string): {
    runtimeId: string;
    workspaceId: string;
    files: WorkspaceFile[];
  };
  reportClientRuntimeError(runtimeId: string, report: BrowserRuntimeErrorReport): Promise<RuntimeSession>;
  stopProjectRuntime(runtimeId: string): Promise<RuntimeSession>;
}
