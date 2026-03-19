import { LocalRuntimeService } from "@/lib/runtime/service/local-runtime-service";

declare global {
  var __appDesignerRuntimeService__: LocalRuntimeService | undefined;
}

function getOrCreateRuntimeService() {
  const current = globalThis.__appDesignerRuntimeService__;

  if (current && typeof current.getRuntimeWorkspaceFiles === "function") {
    return current;
  }

  const next = new LocalRuntimeService();
  globalThis.__appDesignerRuntimeService__ = next;
  return next;
}

export const runtimeService = getOrCreateRuntimeService();
