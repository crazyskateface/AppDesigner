import assert from "node:assert/strict";
import test from "node:test";

import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { createProjectBriefFromAppSpec } from "@/lib/planner/app-spec-to-project-brief";
import { generateViteReactAppFilesFromProjectBrief } from "@/lib/codegen/vite-react/llm-app-files";
import { validateGeneratedSourceBundleCandidate } from "@/lib/codegen/vite-react/source-bundle-normalize";
import { executePackageAction } from "@/lib/applications/orchestrator/executors/package-action-executor";

class StubProvider implements StructuredObjectGenerator {
  constructor(private readonly value: unknown, private readonly shouldThrow = false) {}

  async generateStructuredObject() {
    if (this.shouldThrow) {
      throw new Error("provider failure");
    }

    return {
      content: this.value,
      provider: {
        name: "stub",
        model: "stub-model",
      },
    };
  }
}

test("LLM app-files generator repairs the brief module and normalizes allowed file paths", async () => {
  const brief = createProjectBriefFromAppSpec(generateFallbackAppSpec("Build a CRM for a solo consultant to track leads and meetings."));

  const result = await generateViteReactAppFilesFromProjectBrief(brief, {
    provider: new StubProvider({
      bundleId: " consultant-bundle ",
      targetKind: "vite-react-static",
      entryModule: "src/App.tsx",
      files: [
        {
          path: ".\\src\\App.tsx",
          kind: "source",
          content: 'import { LeadPanel } from "./components/LeadPanel";\n\nexport default function App() { return <LeadPanel />; }',
        },
        {
          path: "src/styles.css",
          kind: "source",
          content: ".lead-panel { padding: 24px; }",
        },
        {
          path: "src/components/LeadPanel.tsx",
          kind: "source",
          content: 'export function LeadPanel() { return <div className="lead-panel">Lead panel</div>; }',
        },
      ],
      notes: ["Generated bundle"],
    }),
  });

  assert.equal(result.generationMeta.source, "llm");
  assert.equal(result.generationMeta.repaired, true);
  assert.ok(result.files.some((file) => file.path === "src/project-brief.ts"));
  assert.ok(result.files.some((file) => file.path === "src/components/LeadPanel.tsx"));
});

test("LLM app-files generator preserves bounded package requirements and richer source paths", async () => {
  const brief = createProjectBriefFromAppSpec(generateFallbackAppSpec("Build a CRM with routing and charts."));

  const result = await generateViteReactAppFilesFromProjectBrief(brief, {
    provider: new StubProvider({
      bundleId: "crm-bundle",
      targetKind: "vite-react-static",
      entryModule: "src/App.tsx",
      files: [
        {
          path: "src/App.tsx",
          kind: "source",
          content: 'import DashboardPage from "./pages/DashboardPage";\nexport default function App() { return <DashboardPage />; }',
        },
        {
          path: "src/styles.css",
          kind: "source",
          content: "body { margin: 0; }",
        },
        {
          path: "src/pages/DashboardPage.tsx",
          kind: "source",
          content: 'export default function DashboardPage() { return <main>Dashboard</main>; }',
        },
      ],
      packageRequirements: [
        {
          name: "react-router-dom",
          section: "dependencies",
        },
      ],
      notes: ["Generated app tree"],
    }),
  });

  assert.equal(result.files.some((file) => file.path === "src/pages/DashboardPage.tsx"), true);
  assert.deepEqual(result.packageRequirements, [{ name: "react-router-dom", version: undefined, section: "dependencies" }]);
});

test("source bundle validation rejects disallowed generated file paths", () => {
  const validation = validateGeneratedSourceBundleCandidate({
    bundleId: "bad-bundle",
    targetKind: "vite-react-static",
    entryModule: "src/App.tsx",
    files: [
      { path: "src/project-brief.ts", kind: "source", content: "export const projectBrief = {};\n" },
      { path: "src/App.tsx", kind: "source", content: "export default function App() { return null; }\n" },
      { path: "src/styles.css", kind: "source", content: "body { margin: 0; }\n" },
      { path: "src/server/index.ts", kind: "source", content: "export const nope = true;\n" },
    ],
    notes: [],
  });

  assert.equal(validation.success, false);
});

test("source bundle validation rejects unsupported projectBrief.sections references", () => {
  const validation = validateGeneratedSourceBundleCandidate({
    bundleId: "bad-app-shape",
    targetKind: "vite-react-static",
    entryModule: "src/App.tsx",
    files: [
      { path: "src/project-brief.ts", kind: "source", content: "export const projectBrief = {};\n" },
      {
        path: "src/App.tsx",
        kind: "source",
        content: 'export default function App() { return <div>{projectBrief.sections[0].title}</div>; }\n',
      },
      { path: "src/styles.css", kind: "source", content: "body { margin: 0; }\n" },
    ],
    notes: [],
  });

  assert.equal(validation.success, false);
});

test("LLM app-files generator can use the explicit template fallback", async () => {
  const brief = createProjectBriefFromAppSpec(generateFallbackAppSpec("Build an inventory app for a small warehouse team."));

  const result = await generateViteReactAppFilesFromProjectBrief(brief, {
    provider: new StubProvider(null, true),
    fallback: "template",
  });

  assert.equal(result.generationMeta.source, "template-fallback");
  assert.ok(result.files.some((file) => file.path === "src/App.tsx"));
  assert.ok(result.files.some((file) => file.path === "src/project-brief.ts"));
});

test("package action executor rejects unsafe package specs", () => {
  assert.throws(
    () =>
      executePackageAction(
        {
          id: "pkg-1",
          kind: "dependency.change-set",
          reason: "Add a package.",
          executionPolicy: "execute",
          safety: {
            allowExecution: true,
            maxPackages: 8,
          },
          inputs: {
            packages: [
              {
                name: "evil-package",
                version: "file:../evil",
                change: "add",
                section: "dependencies",
              },
            ],
          },
        },
        {
          packageJsonContent: JSON.stringify({ dependencies: {}, devDependencies: {} }),
        },
      ),
    /unsafe package spec/i,
  );
});
