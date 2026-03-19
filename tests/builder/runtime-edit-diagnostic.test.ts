import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createViteReactScaffoldFiles } from "@/lib/codegen/vite-react/scaffold";
import { createTemplateViteReactAppFiles } from "@/lib/codegen/vite-react/app-files";
import type { WorkspaceManifest } from "@/lib/workspace/model";
import type { ProjectBrief } from "@/lib/planner/project-brief";

const stubManifest: WorkspaceManifest = {
  packageManager: "npm",
  installCommand: ["npm", "install"],
  devCommand: ["npm", "run", "dev"],
  buildCommand: ["npm", "run", "build"],
  containerPort: 5173,
  dockerfilePath: "Dockerfile",
};

const stubBrief: ProjectBrief = {
  title: "Test App",
  summary: "A test application",
  prompt: "Build a test app",
  pages: [
    { title: "Dashboard", summary: "Main view", sectionTitles: ["Stats", "Activity"] },
    { title: "Settings", summary: "App settings", sectionTitles: ["General"] },
  ],
};

describe("runtime-edit-diagnostic", () => {
  describe("entry point chain", () => {
    it("index.html loads /src/main.tsx", () => {
      const scaffold = createViteReactScaffoldFiles("Test App", stubManifest);
      const indexHtml = scaffold.find((f) => f.path === "index.html");
      assert.ok(indexHtml, "index.html must exist in scaffold");
      assert.ok(
        indexHtml.content.includes('src="/src/main.tsx"'),
        "index.html must load /src/main.tsx",
      );
    });

    it("main.tsx imports App from ./App", () => {
      const scaffold = createViteReactScaffoldFiles("Test App", stubManifest);
      const mainTsx = scaffold.find((f) => f.path === "src/main.tsx");
      assert.ok(mainTsx, "src/main.tsx must exist in scaffold");
      assert.ok(
        mainTsx.content.includes('import App from "./App"'),
        "main.tsx must import App from ./App",
      );
    });

    it("main.tsx renders <App /> inside error boundary", () => {
      const scaffold = createViteReactScaffoldFiles("Test App", stubManifest);
      const mainTsx = scaffold.find((f) => f.path === "src/main.tsx")!;
      assert.ok(mainTsx.content.includes("<App />"), "main.tsx must render <App />");
      assert.ok(
        mainTsx.content.includes("PreviewErrorBoundary"),
        "main.tsx must wrap App in PreviewErrorBoundary",
      );
    });
  });

  describe("no stale spec-driven rendering paths", () => {
    it("generated App.tsx does not reference appSpec or projectBrief", () => {
      const appFiles = createTemplateViteReactAppFiles(stubBrief);
      const appTsx = appFiles.find((f) => f.path === "src/App.tsx");
      assert.ok(appTsx, "src/App.tsx must exist");
      assert.ok(
        !appTsx.content.includes("appSpec"),
        "App.tsx must not reference appSpec at runtime",
      );
      assert.ok(
        !appTsx.content.includes("projectBrief"),
        "App.tsx must not reference projectBrief at runtime",
      );
    });

    it("generated page components do not reference appSpec or projectBrief", () => {
      const appFiles = createTemplateViteReactAppFiles(stubBrief);
      const pageFiles = appFiles.filter((f) => f.path.startsWith("src/pages/"));
      assert.ok(pageFiles.length > 0, "at least one page file must be generated");
      for (const page of pageFiles) {
        assert.ok(
          !page.content.includes("appSpec"),
          `${page.path} must not reference appSpec at runtime`,
        );
        assert.ok(
          !page.content.includes("projectBrief"),
          `${page.path} must not reference projectBrief at runtime`,
        );
      }
    });

    it("main.tsx does not reference appSpec or projectBrief", () => {
      const scaffold = createViteReactScaffoldFiles("Test App", stubManifest);
      const mainTsx = scaffold.find((f) => f.path === "src/main.tsx")!;
      assert.ok(
        !mainTsx.content.includes("appSpec"),
        "main.tsx must not reference appSpec at runtime",
      );
      assert.ok(
        !mainTsx.content.includes("projectBrief"),
        "main.tsx must not reference projectBrief at runtime",
      );
    });
  });

  describe("direct-edit file overlay", () => {
    it("overlay files replace scaffold content at matching paths", () => {
      const appFiles = createTemplateViteReactAppFiles(stubBrief);
      const appTsx = appFiles.find((f) => f.path === "src/App.tsx")!;

      // Simulate a direct-edit overlay: new App.tsx content replaces original
      const editedContent = 'export default function App() { return <h1>Landing Page</h1>; }\n';
      const overlay = new Map<string, string>();
      overlay.set("src/App.tsx", editedContent);

      // After overlay, the workspace should have the new content
      const resultFiles = appFiles.map((f) => ({
        ...f,
        content: overlay.get(f.path) ?? f.content,
      }));

      const resultApp = resultFiles.find((f) => f.path === "src/App.tsx")!;
      assert.equal(resultApp.content, editedContent, "overlay must replace file content exactly");

      // Non-overlaid files should be unchanged
      const resultStyles = resultFiles.find((f) => f.path === "src/styles.css")!;
      const originalStyles = appFiles.find((f) => f.path === "src/styles.css")!;
      assert.equal(resultStyles.content, originalStyles.content, "non-overlaid files must remain unchanged");
    });
  });
});
