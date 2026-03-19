import type { WorkspacePlan } from "@/lib/workspace/model";

import { hashWorkspaceContent } from "@/lib/builder/edits/content-hash";
import {
  workspaceEditChangeSetSchema,
  type WorkspaceEditChangeSet,
  type WorkspaceEditOperation,
} from "@/lib/builder/edits/schema";
import { isAllowedGeneratedSourcePath } from "@/lib/codegen/vite-react/source-bundle-contract";

function createOperationId(path: string) {
  const slug = path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return `edit-${slug || "file"}`;
}

export function deriveWorkspaceEditChangeSet(
  currentPlan: WorkspacePlan,
  nextPlan: WorkspacePlan,
  runtimeId: string | null,
): WorkspaceEditChangeSet {
  const currentByPath = new Map(
    currentPlan.files.filter((file) => isAllowedGeneratedSourcePath(file.path)).map((file) => [file.path, file]),
  );
  const nextByPath = new Map(
    nextPlan.files.filter((file) => isAllowedGeneratedSourcePath(file.path)).map((file) => [file.path, file]),
  );
  const allPaths = [...new Set([...currentByPath.keys(), ...nextByPath.keys()])].sort();

  const operations: WorkspaceEditOperation[] = allPaths.flatMap((path): WorkspaceEditOperation[] => {
    const currentFile = currentByPath.get(path);
    const nextFile = nextByPath.get(path);

    if (!currentFile && !nextFile) {
      return [];
    }

    if (!currentFile && nextFile) {
      return [{
        id: createOperationId(path),
        type: "create-file" as const,
        path,
        kind: nextFile.kind,
        expectedExistingState: "must-not-exist" as const,
        previousContentHash: null,
        nextContent: nextFile.content,
        reason: `Create ${path} in the live workspace.`,
      }];
    }

    if (currentFile && !nextFile) {
      return [{
        id: createOperationId(path),
        type: "delete-file" as const,
        path,
        kind: currentFile.kind,
        expectedExistingState: "must-exist" as const,
        previousContentHash: hashWorkspaceContent(currentFile.content),
        nextContent: null,
        reason: `Delete ${path} from the live workspace.`,
      }];
    }

    if (!currentFile || !nextFile) {
      return [];
    }

    if (currentFile.content === nextFile.content && currentFile.kind === nextFile.kind) {
      return [];
    }

    return [{
      id: createOperationId(path),
      type: "replace-file" as const,
      path,
      kind: nextFile.kind,
      expectedExistingState: "must-exist" as const,
      previousContentHash: hashWorkspaceContent(currentFile.content),
      nextContent: nextFile.content,
      reason: `Replace ${path} in the live workspace.`,
    }];
  });

  return workspaceEditChangeSetSchema.parse({
    changeSetId: `changeset-${nextPlan.workspaceId}`,
    projectId: currentPlan.projectId,
    workspaceId: currentPlan.workspaceId,
    runtimeId,
    mode: "edit",
    summary: `Apply ${operations.length} bounded workspace edit operations.`,
    source: "plan-diff",
    repairNotes: [],
    operations,
  });
}
