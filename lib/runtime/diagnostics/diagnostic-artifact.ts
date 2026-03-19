import type { GeneratedFileSet } from "@/lib/codegen/model";
import type { ProjectBrief } from "@/lib/planner/project-brief";
import type { InspectionArtifact } from "@/lib/runtime/inspection/inspect-runtime";
import type { RuntimeFailure } from "@/lib/runtime/logs";
import type { WorkspaceFile } from "@/lib/workspace/model";

export type DiagnosticArtifact = {
  diagnosticId: string;
  inspectionId: string;
  failureKind: InspectionArtifact["failureKind"];
  runtimeFailure?: RuntimeFailure;
  logExcerpt: string;
  stackExcerpt: string;
  allowedFiles: string[];
  currentFiles: WorkspaceFile[];
  projectBrief: ProjectBrief;
  projectMemorySummary?: string;
  generatedFileMetadata: GeneratedFileSet["metadata"];
  attemptNumber: number;
};
