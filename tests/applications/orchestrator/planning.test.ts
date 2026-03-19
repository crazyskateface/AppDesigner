import assert from "node:assert/strict";
import test from "node:test";

import { planProjectFromPrompt } from "@/lib/applications/orchestrator/main";
import type { StructuredObjectGenerator } from "@/lib/llm/types";

class StubProvider implements StructuredObjectGenerator {
  async generateStructuredObject() {
    return {
      content: {
        briefId: "solo-consultant-crm",
        title: "Solo Consultant CRM",
        prompt: "Build a CRM for a solo consultant to track leads and meetings.",
        summary: "CRM workspace for managing leads, meetings, and follow-ups.",
        targetKind: "vite-react-static",
        navigation: [{ id: "overview-nav", label: "Overview", pageId: "overview" }],
        pages: [
          {
            id: "overview",
            title: "Overview",
            pageType: "dashboard",
            summary: "Track pipeline health and recent activity.",
            sectionTitles: ["Key metrics", "Recent activity"],
          },
        ],
        constraints: ["Generate a runnable Vite + React workspace."],
        source: {
          kind: "llm-plan",
          referenceId: "solo-consultant-crm",
        },
      },
      provider: {
        name: "stub",
        model: "stub-model",
      },
    };
  }
}

test("planProjectFromPrompt returns explicit plan-stage workflow metadata", async () => {
  const result = await planProjectFromPrompt("Build a CRM for a solo consultant to track leads and meetings.", {
    provider: new StubProvider(),
  });

  assert.equal(result.projectBrief.source.kind, "llm-plan");
  assert.equal(result.workflow.mode, "plan");
  assert.deepEqual(
    result.workflow.stages.map((stage) => stage.stage),
    ["intake", "plan"],
  );
  assert.equal(result.workflow.stages[1]?.provider?.name, "stub");
});
