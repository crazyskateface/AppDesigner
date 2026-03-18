import type { AppSpec } from "@/lib/domain/app-spec";
import type { RuntimeSession } from "@/lib/runtime/service/dto";

type StartRuntimeFn = (spec: AppSpec) => Promise<RuntimeSession>;
type StopRuntimeFn = (runtimeId: string) => Promise<void>;
type AwaitRuntimeReadyFn = (session: RuntimeSession) => Promise<RuntimeSession>;

type ReplaceRuntimeOptions = {
  candidateSpec: AppSpec;
  previousRuntime: RuntimeSession | null;
  startRuntime: StartRuntimeFn;
  awaitRuntimeReady: AwaitRuntimeReadyFn;
  stopRuntime: StopRuntimeFn;
};

export class RuntimeReplacementError extends Error {
  constructor(
    message: string,
    public readonly failedSession: RuntimeSession | null = null,
  ) {
    super(message);
  }
}

export async function replaceRuntimeForSpec({
  candidateSpec,
  previousRuntime,
  startRuntime,
  awaitRuntimeReady,
  stopRuntime,
}: ReplaceRuntimeOptions) {
  const startedSession = await startRuntime(candidateSpec);

  if (startedSession.status === "failed") {
    throw new RuntimeReplacementError(
      startedSession.failure?.message || "Could not prepare the updated runtime.",
      startedSession,
    );
  }

  const nextSession = await awaitRuntimeReady(startedSession);

  if (nextSession.status !== "running") {
    throw new RuntimeReplacementError(
      nextSession.failure?.message || "The updated runtime did not become ready.",
      nextSession,
    );
  }

  if (previousRuntime?.runtimeId) {
    await stopRuntime(previousRuntime.runtimeId);
  }

  return nextSession;
}
