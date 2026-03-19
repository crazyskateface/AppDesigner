import type { ProjectBrief } from "@/lib/planner/project-brief";
import type { GeneratedFileSet } from "@/lib/codegen/model";
import type { WorkspaceManifest } from "@/lib/workspace/model";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { generateViteReactAppFilesFromProjectBrief } from "@/lib/codegen/vite-react/llm-app-files";
import { createViteReactScaffoldFiles } from "@/lib/codegen/vite-react/scaffold";

export async function generateViteReactFileSetFromProjectBrief(
  brief: ProjectBrief,
  manifest: WorkspaceManifest,
  options: {
    provider?: StructuredObjectGenerator;
    fallback?: "none" | "template";
  } = {},
): Promise<GeneratedFileSet> {
  const appFileResult = await generateViteReactAppFilesFromProjectBrief(brief, {
    provider: options.provider,
    fallback: options.fallback ?? "none",
  });
  const files = [...createViteReactScaffoldFiles(brief.title, manifest), ...appFileResult.files];

  return {
    strategy: "direct-codegen",
    targetKind: "vite-react-static",
    title: brief.title,
    manifest,
    files,
    metadata: {
      sourceKind: "project-brief",
      sourceId: brief.briefId,
      generation: {
        scaffold: "deterministic",
        appFiles: appFileResult.generationMeta.source,
        repaired: appFileResult.generationMeta.repaired,
        provider: appFileResult.generationMeta.provider,
        fallbackReason: appFileResult.generationMeta.fallbackReason,
      },
    },
  };
}
