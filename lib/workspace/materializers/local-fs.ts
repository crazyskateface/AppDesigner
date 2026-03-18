import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MaterializedWorkspace, WorkspacePlan } from "@/lib/workspace/model";

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
  };
}
