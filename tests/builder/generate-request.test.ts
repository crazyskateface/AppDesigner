import assert from "node:assert/strict";
import test from "node:test";

import { resolveBuilderGenerateRequest } from "@/lib/builder/generation/resolve-request";
import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import type { StructuredGenerationRequest, StructuredObjectGenerator } from "@/lib/llm/types";

class StubProvider implements StructuredObjectGenerator {
  constructor(private readonly handlers: Record<string, unknown>) {}

  async generateStructuredObject(input: StructuredGenerationRequest) {
    return {
      content: this.handlers[input.schemaName],
      provider: {
        name: "stub",
        model: "stub-model",
      },
    };
  }
}

test("builder generation request returns clarification_required when the clarify gate asks questions", async () => {
  const response = await resolveBuilderGenerateRequest(
    {
      prompt: "Build an app for my business team.",
      mode: "create",
      clarificationAnswers: [],
    },
    {
      provider: new StubProvider({
        clarification_decision: {
          decision: "ask-clarify",
          summary: "The prompt needs more product detail.",
          questions: [
            {
              id: "clarification-audience",
              label: "Who is this app for?",
              required: true,
            },
          ],
        },
      }),
    },
  );

  assert.equal(response.status, "clarification_required");
  assert.equal(response.clarification.questions.length, 1);
});

test("builder generation request returns generation_ready once the request is buildable", async () => {
  const appSpec = generateFallbackAppSpec("Build a CRM for a solo consultant to track leads and meetings.");

  const response = await resolveBuilderGenerateRequest(
    {
      prompt: "Build a CRM for a solo consultant.",
      mode: "create",
      clarificationAnswers: [],
    },
    {
      provider: new StubProvider({
        clarification_decision: {
          decision: "build-now",
          summary: "Ready to build.",
          questions: [],
        },
        app_spec: appSpec,
      }),
    },
  );

  assert.equal(response.status, "generation_ready");
  assert.equal(response.appSpec.title, appSpec.title);
});

test("builder generation request proceeds after one answered clarification batch instead of throwing", async () => {
  const appSpec = generateFallbackAppSpec("Build a CRM for a small operations team to track leads and meetings.");

  const response = await resolveBuilderGenerateRequest(
    {
      prompt: "Build an app for my business team.",
      mode: "create",
      clarificationAnswers: [
        {
          questionId: "clarification-audience",
          label: "Who is this app for?",
          answer: "A small operations team.",
        },
        {
          questionId: "clarification-workflow",
          label: "What are the main workflows?",
          answer: "Track leads, meetings, and follow-ups.",
        },
        {
          questionId: "clarification-shape",
          label: "What kind of product should this feel like?",
          answer: "A CRM dashboard.",
        },
      ],
    },
    {
      provider: new StubProvider({
        clarification_decision: {
          decision: "ask-clarify",
          summary: "The prompt still looks broad.",
          questions: [
            {
              id: "clarification-extra",
              label: "Extra question",
              required: true,
            },
          ],
        },
        app_spec: appSpec,
      }),
    },
  );

  assert.equal(response.status, "generation_ready");
  assert.equal(response.appSpec.title, appSpec.title);
});
