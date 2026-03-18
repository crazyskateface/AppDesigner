import type { RunnerHandle, RuntimeTarget } from "@/lib/runtime/contracts";
import type { RuntimeSession } from "@/lib/runtime/service/dto";

export type RuntimeSessionRecord = RuntimeSession & {
  handle?: RunnerHandle;
  target?: RuntimeTarget;
};

export interface RuntimeSessionStore {
  save(session: RuntimeSessionRecord): void;
  get(runtimeId: string): RuntimeSessionRecord | null;
  update(runtimeId: string, updates: Partial<RuntimeSessionRecord>): RuntimeSessionRecord | null;
}
