import { randomUUID } from "node:crypto";

import type { GeneratedFileSet } from "@/lib/codegen/model";
import { isAllowedGeneratedSourcePath } from "@/lib/codegen/vite-react/source-bundle-contract";
import type { ProjectBrief } from "@/lib/planner/project-brief";
import type { InspectionArtifact } from "@/lib/runtime/inspection/inspect-runtime";
import type { RuntimeFailure } from "@/lib/runtime/logs";
import type { DiagnosticArtifact } from "@/lib/runtime/diagnostics/diagnostic-artifact";
import type { MaterializedWorkspace } from "@/lib/workspace/model";

export function buildDiagnosticArtifact(input: {
  inspection: InspectionArtifact;
  runtimeFailure?: RuntimeFailure;
  workspace: MaterializedWorkspace;
  projectBrief: ProjectBrief;
  projectMemorySummary?: string;
  generatedFileMetadata: GeneratedFileSet["metadata"];
}): DiagnosticArtifact {
  const currentFiles = input.workspace.files.filter((file) => isAllowedGeneratedSourcePath(file.path));

  return {
    diagnosticId: randomUUID(),
    inspectionId: input.inspection.inspectionId,
    failureKind: input.inspection.failureKind,
    runtimeFailure: input.runtimeFailure,
    logExcerpt: input.inspection.logExcerpt,
    stackExcerpt: input.inspection.stackExcerpt,
    allowedFiles: currentFiles.map((file) => file.path),
    currentFiles,
    projectBrief: input.projectBrief,
    projectMemorySummary: input.projectMemorySummary,
    generatedFileMetadata: input.generatedFileMetadata,
    attemptNumber: input.inspection.attemptNumber,
  };
}
