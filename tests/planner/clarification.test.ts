import assert from "node:assert/strict";
import test from "node:test";

import { decideClarificationForPromptContext } from "@/lib/planner/clarification/decision";
import { buildPromptContextEnvelope } from "@/lib/planner/prompt-context";
import type { StructuredObjectGenerator } from "@/lib/llm/types";

class StubProvider implements StructuredObjectGenerator {
  constructor(private readonly value: unknown) {}

  async generateStructuredObject() {
    return {
      content: this.value,
      provider: {
        name: "stub",
      },
    };
  }
}

test("clarification decision normalizes a bounded clarification batch", async () => {
  const decision = await decideClarificationForPromptContext(
    buildPromptContextEnvelope({
      prompt: "Build me an app for my business team.",
    }),
    {
      provider: new StubProvider({
        decision: "ask-clarify",
        summary: "Need a little more detail before planning.",
        questions: [
          {
            label: "Who is the app primarily for?",
            reason: "Audience is missing.",
          },
          {
            label: "What are the main workflows?",
          },
        ],
      }),
    },
  );

  assert.equal(decision.decision, "ask-clarify");
  assert.equal(decision.questions.length, 2);
  assert.equal(decision.questions[0]?.id, "clarification-1");
  assert.equal(decision.questions[0]?.placeholder, "Enter a short answer");
});

test("clarification decision defaults to build-now when the model does not explicitly ask to clarify", async () => {
  const decision = await decideClarificationForPromptContext(
    buildPromptContextEnvelope({
      prompt: "Build me an app for my business team.",
    }),
    {
      provider: new StubProvider(null),
    },
  );

  assert.equal(decision.decision, "build-now");
  assert.equal(decision.questions.length, 0);
});
