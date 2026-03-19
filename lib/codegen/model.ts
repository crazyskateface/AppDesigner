import type { WorkspaceFile, WorkspaceManifest, WorkspaceTargetKind } from "@/lib/workspace/model";

export type GeneratedPackageRequirement = {
  name: string;
  version?: string;
  section: "dependencies" | "devDependencies";
};

export type GeneratedSourceBundle = {
  bundleId: string;
  targetKind: WorkspaceTargetKind;
  entryModule: string;
  files: WorkspaceFile[];
  packageRequirements?: GeneratedPackageRequirement[];
  notes: string[];
};

export type GeneratedFileSet = {
  strategy: "direct-codegen";
  targetKind: WorkspaceTargetKind;
  title: string;
  manifest: WorkspaceManifest;
  files: WorkspaceFile[];
  metadata: {
    sourceKind: "project-brief";
    sourceId: string;
    generation: {
      scaffold: "deterministic";
      appFiles: "llm" | "template-fallback";
      repaired: boolean;
      provider?: {
        name: string;
        model?: string;
      };
      fallbackReason?: "missing_api_key" | "provider_error" | "validation_error";
    };
  };
};
