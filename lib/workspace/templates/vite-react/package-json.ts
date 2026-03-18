import type { WorkspaceManifest } from "@/lib/workspace/model";
import { toPackageName } from "@/lib/workspace/templates/vite-react/helpers";

export function createPackageJson(title: string, manifest: WorkspaceManifest) {
  return `${JSON.stringify(
    {
      name: toPackageName(title),
      version: "0.0.1",
      private: true,
      type: "module",
      scripts: {
        dev: manifest.devCommand.join(" "),
        build: manifest.buildCommand.join(" "),
      },
      dependencies: {
        react: "^19.2.0",
        "react-dom": "^19.2.0",
      },
      devDependencies: {
        "@types/react": "^19.2.2",
        "@types/react-dom": "^19.2.2",
        "@vitejs/plugin-react": "^5.1.0",
        typescript: "^5.9.3",
        vite: "^7.1.12",
      },
    },
    null,
    2,
  )}\n`;
}
