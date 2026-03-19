import assert from "node:assert/strict";
import test from "node:test";

import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { createProjectBriefFromAppSpec } from "@/lib/planner/app-spec-to-project-brief";
import { generateViteReactAppFilesFromProjectBrief } from "@/lib/codegen/vite-react/llm-app-files";
import { validateGeneratedSourceBundleCandidate } from "@/lib/codegen/vite-react/source-bundle-normalize";
import { executePackageAction } from "@/lib/applications/orchestrator/executors/package-action-executor";
import { generatedSourceBundleJsonSchema } from "@/lib/codegen/vite-react/source-bundle-contract";

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

test("LLM app-files generator injects app-meta module and normalizes allowed file paths", async () => {
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
          content: 'import LeadPanel from "./components/LeadPanel";\n\nexport default function App() { return <LeadPanel />; }',
        },
        {
          path: "src/styles.css",
          kind: "source",
          content: ".lead-panel { padding: 24px; }",
        },
        {
          path: "src/components/LeadPanel.tsx",
          kind: "source",
          content: 'export default function LeadPanel() { return <div className="lead-panel">Lead panel</div>; }',
        },
      ],
      notes: ["Generated bundle"],
    }),
  });

  assert.equal(result.generationMeta.source, "llm");
  assert.equal(result.generationMeta.repaired, true);
  assert.ok(result.files.some((file) => file.path === "src/app-meta.ts"));
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
  assert.deepEqual(result.packageRequirements, [{ name: "react-router-dom", section: "dependencies" }]);
});

test("source bundle validation rejects disallowed generated file paths", () => {
  const validation = validateGeneratedSourceBundleCandidate({
    bundleId: "bad-bundle",
    targetKind: "vite-react-static",
    entryModule: "src/App.tsx",
    files: [
      { path: "src/app-meta.ts", kind: "source", content: "export const appMeta = { name: 'Test', tagline: '', createdFrom: '' };\n" },
      { path: "src/App.tsx", kind: "source", content: "export default function App() { return null; }\n" },
      { path: "src/styles.css", kind: "source", content: "body { margin: 0; }\n" },
      { path: "src/server/index.ts", kind: "source", content: "export const nope = true;\n" },
    ],
    notes: [],
  });

  assert.equal(validation.success, false);
});

test("source bundle validation rejects data-driven rendering patterns", () => {
  const validation = validateGeneratedSourceBundleCandidate({
    bundleId: "bad-data-driven",
    targetKind: "vite-react-static",
    entryModule: "src/App.tsx",
    files: [
      { path: "src/app-meta.ts", kind: "source", content: "export const appMeta = { name: 'Test', tagline: '', createdFrom: '' };\n" },
      {
        path: "src/App.tsx",
        kind: "source",
        content: 'import { projectBrief } from "./project-brief";\nexport default function App() { return <div>{projectBrief.pages.map(p => <div key={p.id}>{p.title}</div>)}</div>; }\n',
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
  assert.ok(result.files.some((file) => file.path === "src/app-meta.ts"));
  assert.ok(!result.files.some((file) => file.path === "src/project-brief.ts"));
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

test("generatedSourceBundleJsonSchema is strict-mode compliant: all properties in required", () => {
  function checkStrictMode(schema: Record<string, unknown>, path: string) {
    if (schema.type !== "object" || !schema.additionalProperties === false) {
      return;
    }
    const properties = Object.keys((schema.properties ?? {}) as Record<string, unknown>);
    const required = (schema.required ?? []) as string[];
    for (const prop of properties) {
      assert.ok(
        required.includes(prop),
        `Property "${prop}" at ${path} is in properties but not in required (strict-mode violation)`,
      );
    }
    // Recurse into nested object schemas
    for (const [key, value] of Object.entries((schema.properties ?? {}) as Record<string, unknown>)) {
      const propSchema = value as Record<string, unknown>;
      if (propSchema.type === "object") {
        checkStrictMode(propSchema, `${path}.${key}`);
      }
      if (propSchema.type === "array" && propSchema.items) {
        const items = propSchema.items as Record<string, unknown>;
        if (items.type === "object") {
          checkStrictMode(items, `${path}.${key}[]`);
        }
      }
    }
  }

  checkStrictMode(generatedSourceBundleJsonSchema, "root");
});

test("generatedSourceBundleJsonSchema packageRequirements items have no version field", () => {
  const pkgReqs = generatedSourceBundleJsonSchema.properties as Record<string, Record<string, unknown>>;
  const items = pkgReqs.packageRequirements.items as Record<string, unknown>;
  const properties = items.properties as Record<string, unknown>;
  const required = items.required as string[];

  assert.equal(properties.version, undefined, "version should not be in properties");
  assert.ok(!required.includes("version"), "version should not be in required");
});
