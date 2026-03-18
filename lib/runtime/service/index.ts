import { LocalRuntimeService } from "@/lib/runtime/service/local-runtime-service";

declare global {
  var __appDesignerRuntimeService__: LocalRuntimeService | undefined;
}

export const runtimeService =
  globalThis.__appDesignerRuntimeService__ ?? (globalThis.__appDesignerRuntimeService__ = new LocalRuntimeService());
