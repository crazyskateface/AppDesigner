import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MaterializedWorkspace, WorkspacePlan } from "@/lib/workspace/model";
import { applyWorkspaceFileUpdates, type WorkspaceFileUpdate } from "@/lib/workspace/updates/apply-workspace-file-update";

function toAbsoluteWorkspacePath(relativeRootPath: string) {
  return path.resolve(process.cwd(), relativeRootPath);
}

export async function materializeWorkspaceToLocalFs(plan: WorkspacePlan): Promise<MaterializedWorkspace> {
  const absoluteRootPath = toAbsoluteWorkspacePath(plan.relativeRootPath);

  await rm(absoluteRootPath, { recursive: true, force: true });
  await mkdir(absoluteRootPath, { recursive: true });

  for (const file of plan.files) {
    const filePath = path.join(absoluteRootPath, file.path);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.content, "utf8");
  }

  return {
    projectId: plan.projectId,
    workspaceId: plan.workspaceId,
    sourceSpecId: plan.sourceSpecId,
    targetKind: plan.targetKind,
    title: plan.title,
    relativeRootPath: plan.relativeRootPath,
    absoluteRootPath,
    manifest: plan.manifest,
    files: plan.files,
    writtenAt: new Date().toISOString(),
    generationContext: plan.generationContext,
  };
}

export async function applyWorkspaceFileUpdatesToLocalFs(
  workspace: MaterializedWorkspace,
  updates: WorkspaceFileUpdate[],
): Promise<MaterializedWorkspace> {
  for (const update of updates) {
    const filePath = path.join(workspace.absoluteRootPath, update.path);

    if (update.action === "delete") {
      await rm(filePath, { force: true });
      continue;
    }

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, update.content, "utf8");
  }

  return {
    ...workspace,
    files: applyWorkspaceFileUpdates(workspace.files, updates),
    writtenAt: new Date().toISOString(),
  };
}

export async function readWorkspaceFilesFromLocalFs(
  workspace: MaterializedWorkspace,
  paths: string[],
): Promise<MaterializedWorkspace["files"]> {
  const files = await Promise.all(
    [...new Set(paths)].map(async (relativePath) => {
      const filePath = path.join(workspace.absoluteRootPath, relativePath);

      try {
        const content = await readFile(filePath, "utf8");
        const workspaceFile = workspace.files.find((file) => file.path === relativePath);

        return {
          path: relativePath,
          kind: workspaceFile?.kind ?? "source",
          content,
        };
      } catch {
        return null;
      }
    }),
  );

  return files.filter((file): file is NonNullable<typeof file> => Boolean(file));
}
