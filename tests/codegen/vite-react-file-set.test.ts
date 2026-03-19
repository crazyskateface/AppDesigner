import assert from "node:assert/strict";
import test from "node:test";

import { createProjectBriefFromAppSpec } from "@/lib/planner/app-spec-to-project-brief";
import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import { createTemplateViteReactAppFiles } from "@/lib/codegen/vite-react/app-files";
import { generateViteReactFileSetFromProjectBrief } from "@/lib/codegen/vite-react/from-project-brief";
import { createViteReactScaffoldFiles } from "@/lib/codegen/vite-react/scaffold";
import { createViteReactManifest } from "@/lib/workspace/templates/vite-react";
import type { StructuredObjectGenerator } from "@/lib/llm/types";

class StubProvider implements StructuredObjectGenerator {
  async generateStructuredObject() {
    return {
      content: {
        bundleId: "creator-dashboard-bundle",
        targetKind: "vite-react-static",
        entryModule: "src/App.tsx",
        files: [
          {
            path: ".\\src\\App.tsx",
            kind: "source",
            content: 'import { CreatorCard } from "./components/CreatorCard";\n\nexport default function App() { return <CreatorCard />; }',
          },
          {
            path: "src/styles.css",
            kind: "source",
            content: ".creator-card { padding: 16px; }",
          },
          {
            path: "src/components/CreatorCard.tsx",
            kind: "source",
            content: 'export function CreatorCard() { return <div className="creator-card">Creator dashboard</div>; }',
          },
        ],
        notes: ["Generated bundle"],
      },
      provider: {
        name: "stub",
        model: "stub-model",
      },
    };
  }
}

test("vite scaffold files stay separate from app-specific files", () => {
  const brief = createProjectBriefFromAppSpec(generateFallbackAppSpec("Build an inventory app for a small warehouse team."));
  const manifest = createViteReactManifest();

  const scaffoldFiles = createViteReactScaffoldFiles(brief.title, manifest);
  const appFiles = createTemplateViteReactAppFiles(brief);

  assert.ok(scaffoldFiles.some((file) => file.path === "package.json"));
  assert.ok(scaffoldFiles.some((file) => file.path === "src/main.tsx"));
  assert.ok(scaffoldFiles.some((file) => file.path === ".appdesigner/runtime/container-entrypoint.sh"));
  assert.ok(scaffoldFiles.some((file) => file.path === ".appdesigner/runtime/restart-dev-server.sh"));
  assert.ok(!scaffoldFiles.some((file) => file.path === "src/App.tsx"));

  const dockerfile = scaffoldFiles.find((file) => file.path === manifest.dockerfilePath);
  assert.match(dockerfile?.content ?? "", /container-entrypoint\.sh/);

  assert.ok(appFiles.some((file) => file.path === "src/App.tsx"));
  assert.ok(appFiles.some((file) => file.path === "src/project-brief.ts"));
  assert.ok(!appFiles.some((file) => file.path === "package.json"));
});

test("from-project-brief composes scaffold and LLM-generated app-specific files into one file set", async () => {
  const brief = createProjectBriefFromAppSpec(generateFallbackAppSpec("Build a creator dashboard for a newsletter operator."));
  const manifest = createViteReactManifest();

  const fileSet = await generateViteReactFileSetFromProjectBrief(brief, manifest, {
    provider: new StubProvider(),
  });

  assert.ok(fileSet.files.some((file) => file.path === "package.json"));
  assert.ok(fileSet.files.some((file) => file.path === "src/main.tsx"));
  assert.ok(fileSet.files.some((file) => file.path === "src/App.tsx"));
  assert.ok(fileSet.files.some((file) => file.path === "src/project-brief.ts"));
  assert.ok(fileSet.files.some((file) => file.path === "src/components/CreatorCard.tsx"));
  assert.equal(fileSet.metadata.generation.appFiles, "llm");
  assert.equal(fileSet.metadata.generation.provider?.name, "stub");
});
