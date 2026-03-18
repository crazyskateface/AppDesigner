import type { AppSpec, BuilderMode } from "@/lib/domain/app-spec";

export function resolveBuilderMode(currentSpec: AppSpec | null): BuilderMode {
  return currentSpec ? "edit" : "create";
}
