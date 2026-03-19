import type { GeneratedFileSet } from "@/lib/codegen/model";
import type { ProjectBrief } from "@/lib/planner/project-brief";
import type { ProjectBuildMemory } from "@/lib/project-memory/schema";

export type WorkspaceTargetKind = "vite-react-static";

export type WorkspaceFileKind = "source" | "config" | "asset";

export type WorkspaceFile = {
  path: string;
  kind: WorkspaceFileKind;
  content: string;
};

export type WorkspaceManifest = {
  packageManager: "npm";
  installCommand: string[];
  devCommand: string[];
  buildCommand: string[];
  containerPort: number;
  dockerfilePath: string;
};

export type WorkspacePlan = {
  projectId: string;
  workspaceId: string;
  sourceSpecId: string;
  targetKind: WorkspaceTargetKind;
  title: string;
  relativeRootPath: string;
  manifest: WorkspaceManifest;
  files: WorkspaceFile[];
  generationContext?: {
    projectBrief: ProjectBrief;
    fileSetMetadata: GeneratedFileSet["metadata"];
    projectMemory?: ProjectBuildMemory;
  };
};

export type MaterializedWorkspace = {
  projectId: string;
  workspaceId: string;
  sourceSpecId: string;
  targetKind: WorkspaceTargetKind;
  title: string;
  relativeRootPath: string;
  absoluteRootPath: string;
  manifest: WorkspaceManifest;
  files: WorkspaceFile[];
  writtenAt: string;
  generationContext?: WorkspacePlan["generationContext"];
};
