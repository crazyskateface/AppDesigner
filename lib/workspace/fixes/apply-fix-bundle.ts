import type { GeneratedFixBundle } from "@/lib/codegen/fixes/fix-bundle-model";
import type { WorkspacePlan } from "@/lib/workspace/model";

export function applyFixBundleToWorkspacePlan(plan: WorkspacePlan, fixBundle: GeneratedFixBundle): WorkspacePlan {
  const byPath = new Map(plan.files.map((file) => [file.path, file]));

  for (const file of fixBundle.files) {
    byPath.set(file.path, file);
  }

  return {
    ...plan,
    files: Array.from(byPath.values()),
  };
}
