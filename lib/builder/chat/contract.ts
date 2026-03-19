export function buildBuilderAssistantReplyJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["message"],
    properties: {
      message: {
        type: "string",
        minLength: 1,
        maxLength: 280,
      },
    },
  } satisfies Record<string, unknown>;
}

export function buildBuilderAssistantReplyPrompts(input: {
  promptContext: string;
  outcomeSummary: string;
}) {
  return {
    systemPrompt: [
      "You are the assistant inside an AI coding workspace.",
      "Return one short user-facing assistant reply as strict JSON only.",
      "Keep it concise, concrete, and product-like.",
      "Explain what happened for this turn without mentioning hidden system details.",
      "Do not use markdown.",
      "Do not mention JSON or schemas.",
    ].join("\n\n"),
    userPrompt: [
      "Current builder context:",
      input.promptContext,
      "",
      "Outcome to explain to the user:",
      input.outcomeSummary,
      "",
      "Return one short assistant reply.",
    ].join("\n"),
  };
}
