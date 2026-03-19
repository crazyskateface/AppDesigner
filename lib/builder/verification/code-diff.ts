import type { WorkspaceFile } from "@/lib/workspace/model";

import { codeChangeDiffSchema, type CodeChangeDiff } from "@/lib/builder/verification/schema";

function toMap(files: WorkspaceFile[]) {
  return new Map(files.map((file) => [file.path, file]));
}

export function diffWorkspaceFiles(previousFiles: WorkspaceFile[], nextFiles: WorkspaceFile[], paths?: string[]): CodeChangeDiff[] {
  const previousByPath = toMap(previousFiles);
  const nextByPath = toMap(nextFiles);
  const allPaths = paths ? [...new Set(paths)] : [...new Set([...previousByPath.keys(), ...nextByPath.keys()])];
  const diffs: CodeChangeDiff[] = [];

  for (const path of allPaths) {
    const previousFile = previousByPath.get(path);
    const nextFile = nextByPath.get(path);

    if (!previousFile && !nextFile) {
      continue;
    }

    if (previousFile && !nextFile) {
      diffs.push(
        codeChangeDiffSchema.parse({
          path,
          changeType: "delete",
          beforeContent: previousFile.content,
          generatedContent: null,
          finalContent: null,
          landingStatus: "missing",
        }),
      );
      continue;
    }

    if (!previousFile && nextFile) {
      diffs.push(
        codeChangeDiffSchema.parse({
          path,
          changeType: "create",
          beforeContent: null,
          generatedContent: nextFile.content,
          finalContent: nextFile.content,
          landingStatus: "landed",
        }),
      );
      continue;
    }

    if (!nextFile || !previousFile || previousFile.content === nextFile.content) {
      continue;
    }

    diffs.push(
      codeChangeDiffSchema.parse({
        path,
        changeType: "update",
        beforeContent: previousFile.content,
        generatedContent: nextFile.content,
        finalContent: nextFile.content,
        landingStatus: "landed",
      }),
    );
  }

  return diffs;
}

export function verifyObservedFileDiffs(
  previousFiles: WorkspaceFile[],
  generatedFiles: WorkspaceFile[],
  finalFiles: WorkspaceFile[],
  paths: string[],
): CodeChangeDiff[] {
  const previousByPath = toMap(previousFiles);
  const generatedByPath = toMap(generatedFiles);
  const finalByPath = toMap(finalFiles);
  const checkedPaths = [...new Set(paths)];

  return checkedPaths.map((path) => {
    const previousFile = previousByPath.get(path);
    const generatedFile = generatedByPath.get(path);
    const finalFile = finalByPath.get(path);
    const changeType = !previousFile && generatedFile ? "create" : previousFile && !generatedFile ? "delete" : "update";

    let landingStatus: CodeChangeDiff["landingStatus"];
    if (changeType === "delete") {
      landingStatus = finalFile ? "overwritten" : "landed";
    } else if (!finalFile) {
      landingStatus = "missing";
    } else if (finalFile.content === (generatedFile?.content ?? null)) {
      landingStatus = previousFile?.content === finalFile.content ? "unchanged" : "landed";
    } else if (finalFile.content === (previousFile?.content ?? null)) {
      landingStatus = "unchanged";
    } else {
      landingStatus = "overwritten";
    }

    return codeChangeDiffSchema.parse({
      path,
      changeType,
      beforeContent: previousFile?.content ?? null,
      generatedContent: generatedFile?.content ?? null,
      finalContent: finalFile?.content ?? null,
      landingStatus,
    });
  });
}
