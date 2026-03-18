import type { RuntimeLogPage, RuntimeSession, StartRuntimeInput } from "@/lib/runtime/service/dto";

export class RuntimeServiceNotFoundError extends Error {
  constructor(runtimeId: string) {
    super(`Runtime session "${runtimeId}" was not found.`);
    this.name = "RuntimeServiceNotFoundError";
  }
}

export interface RuntimeService {
  startProjectRuntime(input: StartRuntimeInput): Promise<RuntimeSession>;
  getRuntimeSnapshot(runtimeId: string): Promise<RuntimeSession>;
  getRuntimeLogs(runtimeId: string): Promise<RuntimeLogPage>;
  stopProjectRuntime(runtimeId: string): Promise<RuntimeSession>;
}
