import type { StructuredObjectGenerator } from "@/lib/llm/types";

import { generateViteReactAppFilesFromProjectBrief } from "@/lib/codegen/vite-react/llm-app-files";
import { isAllowedGeneratedSourcePath } from "@/lib/codegen/vite-react/source-bundle-contract";
import {
  orchestratorActionResultSchema,
  type FileWriteSetAction,
  type OrchestratorActionResult,
} from "@/lib/applications/orchestrator/actions/schema";

export async function executeFileWriteSetAction(
  action: FileWriteSetAction,
  options: {
    provider?: StructuredObjectGenerator;
  } = {},
): Promise<OrchestratorActionResult> {
  const result = await generateViteReactAppFilesFromProjectBrief(action.inputs.projectBrief, {
    provider: options.provider,
    fallback: action.inputs.fallback,
  });

  if (result.files.length > action.safety.maxFiles) {
    throw new Error(`The file action exceeded the allowed file limit of ${action.safety.maxFiles}.`);
  }

  if (!result.files.every((file) => isAllowedGeneratedSourcePath(file.path))) {
    throw new Error("The file action attempted to write outside the allowed app-owned source surface.");
  }

  return orchestratorActionResultSchema.parse({
    actionId: action.id,
    kind: action.kind,
    status: "completed",
    summary: `Prepared ${result.files.length} bounded app-owned source files for ${action.inputs.projectBrief.title}.`,
    artifacts: {
      files: result.files,
      bundle: result.bundle,
      packageRequirements: result.packageRequirements,
      generationMeta: result.generationMeta,
    },
    diagnostics: [],
  });
}
