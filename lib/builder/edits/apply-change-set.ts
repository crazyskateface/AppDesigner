import type { WorkspaceFile } from "@/lib/workspace/model";
import type { WorkspaceFileUpdate } from "@/lib/workspace/updates/apply-workspace-file-update";

import { hashWorkspaceContent } from "@/lib/builder/edits/content-hash";
import type { WorkspaceEditChangeSet } from "@/lib/builder/edits/schema";

export type WorkspaceEditApplyResult = {
  updates: WorkspaceFileUpdate[];
  changedPaths: string[];
  beforeHashes: Record<string, string | null>;
  afterHashes: Record<string, string | null>;
};

export function applyWorkspaceEditChangeSet(
  currentFiles: WorkspaceFile[],
  changeSet: WorkspaceEditChangeSet,
): WorkspaceEditApplyResult {
  const currentByPath = new Map(currentFiles.map((file) => [file.path, file]));
  const updates: WorkspaceFileUpdate[] = [];
  const beforeHashes: Record<string, string | null> = {};
  const afterHashes: Record<string, string | null> = {};

  for (const operation of changeSet.operations) {
    const currentFile = currentByPath.get(operation.path);
    beforeHashes[operation.path] = currentFile ? hashWorkspaceContent(currentFile.content) : null;

    if (operation.type === "delete-file") {
      updates.push({
        action: "delete",
        path: operation.path,
      });
      afterHashes[operation.path] = null;
      continue;
    }

    updates.push({
      action: "upsert",
      path: operation.path,
      kind: operation.kind,
      content: operation.nextContent ?? "",
    });
    afterHashes[operation.path] = hashWorkspaceContent(operation.nextContent ?? "");
  }

  return {
    updates,
    changedPaths: updates.map((update) => update.path),
    beforeHashes,
    afterHashes,
  };
}
