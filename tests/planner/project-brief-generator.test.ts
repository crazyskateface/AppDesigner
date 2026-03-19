import assert from "node:assert/strict";
import test from "node:test";

import { generateProjectBriefFromPrompt } from "@/lib/planner/project-brief-generator";
import type { StructuredGenerationRequest, StructuredObjectGenerator } from "@/lib/llm/types";

class StubProvider implements StructuredObjectGenerator {
  public lastRequest?: { systemPrompt: string; userPrompt: string; schemaName: string };

  constructor(private readonly value: unknown, private readonly shouldThrow = false) {}

  async generateStructuredObject(input: StructuredGenerationRequest) {
    this.lastRequest = input;

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

test("project brief planner normalizes LLM output into a valid ProjectBrief", async () => {
  const result = await generateProjectBriefFromPrompt("Build a CRM for a consultant with leads and meetings.", {
    provider: new StubProvider({
      briefId: " consultant-workspace ",
      title: " Consultant Workspace ",
      prompt: " Build a CRM for a consultant with leads and meetings. ",
      summary: " Founder CRM workspace ",
      targetKind: "vite-react-static",
      navigation: [{ id: "", label: " Overview ", pageId: " Overview " }],
      pages: [
        {
          id: " Overview ",
          title: " Overview ",
          pageType: "dashboard",
          summary: " Track the pipeline ",
          sectionTitles: [" Key metrics ", " Recent meetings "],
        },
      ],
      constraints: [" Use React ", " Keep it founder focused "],
      source: {
        kind: "llm-plan",
        referenceId: "",
      },
    }),
  });

  assert.equal(result.projectBrief.briefId, "consultant-workspace");
  assert.equal(result.projectBrief.navigation[0]?.pageId, "overview");
  assert.equal(result.projectBrief.source.kind, "llm-plan");
  assert.equal(result.generationMeta.source, "llm");
  assert.equal(result.generationMeta.repaired, true);
});

test("project brief planner includes clarification answers in the planning prompt context", async () => {
  const provider = new StubProvider({
    briefId: "clarified-brief",
    title: "Clarified CRM",
    prompt: "Build a CRM for a solo consultant.",
    summary: "CRM workspace for a solo consultant.",
    targetKind: "vite-react-static",
    navigation: [{ id: "overview", label: "Overview", pageId: "overview" }],
    pages: [
      {
        id: "overview",
        title: "Overview",
        pageType: "dashboard",
        summary: "See the current pipeline.",
        sectionTitles: ["Pipeline", "Upcoming meetings"],
      },
    ],
    constraints: ["Use React"],
    source: {
      kind: "llm-plan",
      referenceId: "clarified-brief",
    },
  });

  await generateProjectBriefFromPrompt(
    {
      prompt: "Build a CRM for a solo consultant.",
      mode: "create",
      clarificationAnswers: [
        {
          questionId: "clarification-workflow",
          label: "What are the main workflows?",
          answer: "Track leads, meetings, and follow-ups.",
        },
      ],
    },
    {
      provider,
    },
  );

  assert.match(provider.lastRequest?.userPrompt ?? "", /Clarification answers:/);
  assert.match(provider.lastRequest?.userPrompt ?? "", /Track leads, meetings, and follow-ups/);
});

test("project brief planner surfaces provider failures", async () => {
  await assert.rejects(
    () =>
      generateProjectBriefFromPrompt("Build a booking app for a studio.", {
        provider: new StubProvider(null, true),
      }),
    /provider failure/,
  );
});
