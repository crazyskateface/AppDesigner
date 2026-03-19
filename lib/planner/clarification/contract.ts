import { formatPromptContextForLlm, type PromptContextEnvelope } from "@/lib/planner/prompt-context";

export function buildClarificationPromptContract() {
  return [
    "Return one ClarificationDecision object as strict JSON only.",
    "Do not include prose, markdown, or explanations.",
    "Your job is to decide whether the request is specific enough to proceed into ProjectBrief planning.",
    "Choose decision = build-now only when app type, target user, and core workflow are all clear enough to build a credible first version.",
    "Choose decision = ask-clarify only when missing detail would materially weaken the ProjectBrief.",
    "If you ask clarifying questions, ask at most 3 short, concrete questions.",
    "Do not ask open-ended brainstorming questions.",
    "Each question should target one missing detail such as audience, workflow, key records, or product shape.",
    "If clarification answers are already present and still weak, do not invent a second long loop; return ask-clarify only if the request is still genuinely not buildable.",
  ].join("\n");
}

export function buildClarificationPrompts(context: PromptContextEnvelope) {
  const contract = buildClarificationPromptContract();

  return {
    systemPrompt: [
      "You are the bounded clarification gate for an AI coding workspace.",
      contract,
    ].join("\n\n"),
    userPrompt: [
      formatPromptContextForLlm(context),
      "Decide whether the system should build now or ask clarifying questions.",
    ].join("\n\n"),
  };
}

export const clarificationDecisionJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["decision", "summary", "questions"],
  properties: {
    decision: { type: "string", enum: ["build-now", "ask-clarify"] },
    summary: { type: "string", minLength: 1 },
    questions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "required"],
        properties: {
          id: { type: "string", minLength: 1 },
          label: { type: "string", minLength: 1 },
          placeholder: { type: "string", minLength: 1 },
          reason: { type: "string", minLength: 1 },
          required: { type: "boolean" },
        },
      },
    },
  },
};
