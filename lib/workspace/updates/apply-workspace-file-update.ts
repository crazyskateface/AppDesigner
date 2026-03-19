import type { WorkspaceFile, WorkspaceFileKind } from "@/lib/workspace/model";

export type WorkspaceFileUpdate =
  | {
      action: "upsert";
      path: string;
      kind: WorkspaceFileKind;
      content: string;
    }
  | {
      action: "delete";
      path: string;
    };

export function applyWorkspaceFileUpdates(files: WorkspaceFile[], updates: WorkspaceFileUpdate[]): WorkspaceFile[] {
  const byPath = new Map(files.map((file) => [file.path, file]));

  for (const update of updates) {
    if (update.action === "delete") {
      byPath.delete(update.path);
      continue;
    }

    byPath.set(update.path, {
      path: update.path,
      kind: update.kind,
      content: update.content,
    });
  }

  return Array.from(byPath.values()).sort((left, right) => left.path.localeCompare(right.path));
}
