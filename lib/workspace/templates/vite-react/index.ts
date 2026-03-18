import type { AppSpec } from "@/lib/domain/app-spec";
import type { WorkspaceFile, WorkspaceManifest } from "@/lib/workspace/model";
import { createAppFiles } from "@/lib/workspace/templates/vite-react/app-files";
import { createDockerfile } from "@/lib/workspace/templates/vite-react/dockerfile";
import { createIndexHtml } from "@/lib/workspace/templates/vite-react/index-html";
import { createPackageJson } from "@/lib/workspace/templates/vite-react/package-json";
import { createViteConfig } from "@/lib/workspace/templates/vite-react/vite-config";

export const viteReactContainerPort = 4173;

export function createViteReactManifest(): WorkspaceManifest {
  return {
    packageManager: "npm",
    installCommand: ["npm", "install"],
    devCommand: ["vite"],
    buildCommand: ["vite", "build"],
    containerPort: viteReactContainerPort,
    dockerfilePath: "Dockerfile",
  };
}

export function createViteReactWorkspaceFiles(spec: AppSpec, manifest: WorkspaceManifest): WorkspaceFile[] {
  return [
    {
      path: "package.json",
      kind: "config",
      content: createPackageJson(spec.title, manifest),
    },
    {
      path: "vite.config.ts",
      kind: "config",
      content: createViteConfig(),
    },
    {
      path: "index.html",
      kind: "config",
      content: createIndexHtml(spec.title),
    },
    {
      path: manifest.dockerfilePath,
      kind: "config",
      content: createDockerfile(manifest.containerPort),
    },
    {
      path: ".dockerignore",
      kind: "config",
      content: "node_modules\nnpm-debug.log\n",
    },
    ...createAppFiles(spec),
  ];
}
