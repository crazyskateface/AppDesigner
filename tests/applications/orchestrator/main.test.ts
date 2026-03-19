import assert from "node:assert/strict";
import test from "node:test";

import { runWorkspaceOrchestratorApplication } from "@/lib/applications/orchestrator/main";
import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import type { StructuredObjectGenerator } from "@/lib/llm/types";

class StubProvider implements StructuredObjectGenerator {
  async generateStructuredObject() {
    return {
      content: {
        bundleId: "booking-studio-bundle",
        targetKind: "vite-react-static",
        entryModule: "src/App.tsx",
        files: [
          {
            path: "src/App.tsx",
            kind: "source",
            content: 'export default function App() { return <div className="app-shell">Booking workspace</div>; }',
          },
          {
            path: "src/styles.css",
            kind: "source",
            content: ".app-shell { padding: 24px; }",
          },
          {
            path: "src/components/BookingPanel.tsx",
            kind: "source",
            content: 'export function BookingPanel() { return <section>Booking Panel</section>; }',
          },
        ],
        packageRequirements: [
          {
            name: "react-router-dom",
            section: "dependencies",
          },
        ],
        notes: ["Generated app-specific files from the project brief."],
      },
      provider: {
        name: "stub",
        model: "stub-model",
      },
    };
  }
}

test("runWorkspaceOrchestratorApplication produces a direct-codegen workspace plan", async () => {
  const spec = generateFallbackAppSpec("Create a booking app for a boutique fitness studio.");
  const plan = await runWorkspaceOrchestratorApplication(
    {
      projectId: "project-123",
      appSpec: spec,
    },
    {
      provider: new StubProvider(),
    },
  );

  assert.equal(plan.projectId, "project-123");
  assert.equal(plan.sourceSpecId, spec.appId);
  assert.ok(plan.files.some((file) => file.path === "src/project-brief.ts"));
  assert.ok(plan.files.some((file) => file.path === "src/App.tsx"));
  assert.ok(plan.files.some((file) => file.path === "src/components/BookingPanel.tsx"));
  assert.match(plan.files.find((file) => file.path === "package.json")?.content ?? "", /react-router-dom/);
  assert.equal(plan.targetKind, "vite-react-static");
});
