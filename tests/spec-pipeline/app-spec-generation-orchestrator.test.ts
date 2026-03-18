import assert from "node:assert/strict";
import test from "node:test";

import type { AppSpec } from "@/lib/domain/app-spec";
import { generateAppSpecFromPrompt } from "@/lib/spec-pipeline/app-spec-generation-orchestrator";
import type { StructuredObjectGenerator } from "@/lib/llm/types";

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

const baseSpec: AppSpec = {
  appId: "consultant-crm",
  prompt: "Build a CRM for a solo consultant to track leads and meetings.",
  title: "Consultant CRM",
  archetype: "crm",
  entities: [
    {
      id: "lead",
      name: "Lead",
      fields: [
        { key: "name", label: "Name", type: "text" },
        { key: "stage", label: "Stage", type: "status" },
      ],
    },
  ],
  navigation: [{ id: "dashboard-nav", label: "Dashboard", pageId: "dashboard" }],
  pages: [
    {
      id: "dashboard",
      title: "Dashboard",
      pageType: "dashboard",
      pageLayout: "dashboard",
      entityIds: ["lead"],
      sections: [
        {
          id: "stats",
          type: "stats",
          title: "Key stats",
          entityId: "lead",
          placement: "full",
          emphasis: "hero",
        },
      ],
    },
  ],
};

test("create mode uses fallback when the provider fails", async () => {
  const result = await generateAppSpecFromPrompt(baseSpec.prompt, {
    provider: new StubProvider(null, true),
    mode: "create",
  });

  assert.equal(result.generationMeta.source, "fallback");
  assert.equal(result.generationMeta.fallbackReason, "provider_error");
});

test("edit mode fails closed when the provider fails", async () => {
  await assert.rejects(
    () =>
      generateAppSpecFromPrompt("Add a calendar page for meetings.", {
        provider: new StubProvider(null, true),
        mode: "edit",
        currentSpec: baseSpec,
      }),
    /provider failure/,
  );
});

test("orchestrator normalizes and repairs minor output issues", async () => {
  const rawCandidate = {
    ...baseSpec,
    appId: " Consultant CRM ",
    title: " Consultant CRM ",
    navigation: [{ id: "", label: " Dashboard ", pageId: " Dashboard " }],
    pages: [
      {
        ...baseSpec.pages[0],
        id: " Dashboard ",
        title: " Dashboard ",
        sections: [
          {
            ...baseSpec.pages[0].sections[0],
            id: "",
            title: " Key stats ",
          },
        ],
      },
    ],
  };

  const result = await generateAppSpecFromPrompt(baseSpec.prompt, {
    provider: new StubProvider(rawCandidate),
    mode: "create",
  });

  assert.equal(result.generationMeta.source, "llm");
  assert.equal(result.appSpec.appId, "consultant-crm");
  assert.equal(result.appSpec.navigation[0]?.pageId, "dashboard");
  assert.equal(result.appSpec.pages[0]?.sections[0]?.id, "key-stats");
});
