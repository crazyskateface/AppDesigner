import { isAllowedGeneratedSourcePath } from "@/lib/codegen/vite-react/source-bundle-contract";
import type { WorkspacePlan } from "@/lib/workspace/model";
import type { WorkspaceFileUpdate } from "@/lib/workspace/updates/apply-workspace-file-update";

export type RuntimeUpdateClassification = {
  strategyUsed: "hot-update" | "full-runtime-restart-required";
  updatedPaths: string[];
  updates: WorkspaceFileUpdate[];
  reason?: string;
};

export function classifyRuntimeUpdate(currentPlan: WorkspacePlan, nextPlan: WorkspacePlan): RuntimeUpdateClassification {
  if (currentPlan.targetKind !== nextPlan.targetKind) {
      return {
      strategyUsed: "full-runtime-restart-required",
      updatedPaths: [],
      updates: [],
      reason: "The target runtime kind changed.",
    };
  }

  if (JSON.stringify(currentPlan.manifest) !== JSON.stringify(nextPlan.manifest)) {
      return {
      strategyUsed: "full-runtime-restart-required",
      updatedPaths: [],
      updates: [],
      reason: "The runtime manifest changed.",
    };
  }

  const currentPackageJson = currentPlan.files.find((file) => file.path === "package.json")?.content ?? "";
  const nextPackageJson = nextPlan.files.find((file) => file.path === "package.json")?.content ?? "";

  if (currentPackageJson !== nextPackageJson) {
    return {
      strategyUsed: "full-runtime-restart-required",
      updatedPaths: ["package.json"],
      updates: [],
      reason: "Package dependencies changed and require a full runtime rebuild.",
    };
  }

  const currentHotFiles = new Map(
    currentPlan.files.filter((file) => isAllowedGeneratedSourcePath(file.path)).map((file) => [file.path, file]),
  );
  const nextHotFiles = new Map(
    nextPlan.files.filter((file) => isAllowedGeneratedSourcePath(file.path)).map((file) => [file.path, file]),
  );

  const allHotPaths = new Set([...currentHotFiles.keys(), ...nextHotFiles.keys()]);
  const updates: WorkspaceFileUpdate[] = [];

  for (const path of allHotPaths) {
    const currentFile = currentHotFiles.get(path);
    const nextFile = nextHotFiles.get(path);

    if (!nextFile && currentFile) {
      updates.push({
        action: "delete",
        path,
      });
      continue;
    }

    if (!nextFile) {
      continue;
    }

    if (!currentFile || currentFile.content !== nextFile.content || currentFile.kind !== nextFile.kind) {
      updates.push({
        action: "upsert",
        path,
        kind: nextFile.kind,
        content: nextFile.content,
      });
    }
  }

  return {
    strategyUsed: "hot-update",
    updatedPaths: updates.map((update) => update.path),
    updates,
  };
}
