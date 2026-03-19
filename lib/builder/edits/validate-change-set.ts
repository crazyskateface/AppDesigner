import { isAllowedGeneratedSourcePath } from "@/lib/codegen/vite-react/source-bundle-contract";
import type { WorkspaceFile } from "@/lib/workspace/model";

import { hashWorkspaceContent } from "@/lib/builder/edits/content-hash";
import type { WorkspaceEditChangeSet } from "@/lib/builder/edits/schema";

export type WorkspaceEditValidationResult = {
  valid: boolean;
  validatedPaths: string[];
  rejectedPaths: string[];
  issues: string[];
};

export function validateWorkspaceEditChangeSet(
  currentFiles: WorkspaceFile[],
  changeSet: WorkspaceEditChangeSet,
): WorkspaceEditValidationResult {
  const currentByPath = new Map(currentFiles.map((file) => [file.path, file]));
  const seen = new Set<string>();
  const issues: string[] = [];
  const validatedPaths: string[] = [];
  const rejectedPaths: string[] = [];

  for (const operation of changeSet.operations) {
    const currentFile = currentByPath.get(operation.path);

    if (!isAllowedGeneratedSourcePath(operation.path)) {
      issues.push(`Path "${operation.path}" is outside the bounded editable surface.`);
      rejectedPaths.push(operation.path);
      continue;
    }

    if (seen.has(operation.path)) {
      issues.push(`Path "${operation.path}" has multiple edit operations in one change set.`);
      rejectedPaths.push(operation.path);
      continue;
    }

    seen.add(operation.path);

    if (operation.type === "create-file" && currentFile) {
      issues.push(`Path "${operation.path}" already exists, so create-file is invalid.`);
      rejectedPaths.push(operation.path);
      continue;
    }

    if ((operation.type === "replace-file" || operation.type === "delete-file") && !currentFile) {
      issues.push(`Path "${operation.path}" does not exist, so ${operation.type} is invalid.`);
      rejectedPaths.push(operation.path);
      continue;
    }

    if (operation.expectedExistingState === "must-exist" && !currentFile) {
      issues.push(`Path "${operation.path}" must exist before apply.`);
      rejectedPaths.push(operation.path);
      continue;
    }

    if (operation.expectedExistingState === "must-not-exist" && currentFile) {
      issues.push(`Path "${operation.path}" must not exist before apply.`);
      rejectedPaths.push(operation.path);
      continue;
    }

    if ((operation.type === "create-file" || operation.type === "replace-file") && !operation.nextContent) {
      issues.push(`Path "${operation.path}" is missing nextContent.`);
      rejectedPaths.push(operation.path);
      continue;
    }

    if (operation.previousContentHash && currentFile && hashWorkspaceContent(currentFile.content) !== operation.previousContentHash) {
      issues.push(`Path "${operation.path}" did not match the expected previous content hash.`);
      rejectedPaths.push(operation.path);
      continue;
    }

    validatedPaths.push(operation.path);
  }

  return {
    valid: issues.length === 0,
    validatedPaths,
    rejectedPaths,
    issues,
  };
}
