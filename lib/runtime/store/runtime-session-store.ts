import type { RunnerHandle, RuntimeTarget } from "@/lib/runtime/contracts";
import type { RuntimeSession } from "@/lib/runtime/service/dto";
import type { MaterializedWorkspace, WorkspacePlan } from "@/lib/workspace/model";

export type RuntimeSessionRecord = RuntimeSession & {
  handle?: RunnerHandle;
  target?: RuntimeTarget;
  workspacePlan?: WorkspacePlan;
  workspace?: MaterializedWorkspace;
  browserLogs?: import("@/lib/runtime/logs").RuntimeLogEntry[];
};

export interface RuntimeSessionStore {
  save(session: RuntimeSessionRecord): void;
  get(runtimeId: string): RuntimeSessionRecord | null;
  update(runtimeId: string, updates: Partial<RuntimeSessionRecord>): RuntimeSessionRecord | null;
}
