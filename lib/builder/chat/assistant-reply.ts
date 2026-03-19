import { logStructuredProviderResponse } from "@/lib/llm/debug-log";
import { openAiStructuredObjectProvider } from "@/lib/llm/openai/structured-provider";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { formatPromptContextForLlm, type PromptContextEnvelope } from "@/lib/planner/prompt-context";

import { buildBuilderAssistantReplyJsonSchema, buildBuilderAssistantReplyPrompts } from "@/lib/builder/chat/contract";

type BuilderAssistantReplyInput = {
  promptContext: PromptContextEnvelope;
  outcomeSummary: string;
  fallbackMessage: string;
};

export async function generateBuilderAssistantReply(
  input: BuilderAssistantReplyInput,
  options: {
    provider?: StructuredObjectGenerator;
  } = {},
) {
  const provider = options.provider ?? openAiStructuredObjectProvider;
  const { systemPrompt, userPrompt } = buildBuilderAssistantReplyPrompts({
    promptContext: formatPromptContextForLlm(input.promptContext),
    outcomeSummary: input.outcomeSummary,
  });

  try {
    const providerResult = await provider.generateStructuredObject({
      systemPrompt,
      userPrompt,
      schemaName: "builder_assistant_reply",
      jsonSchema: buildBuilderAssistantReplyJsonSchema(),
    });

    const logPayload = providerResult.rawProviderResponseText ?? providerResult.rawText ?? providerResult.content;

    if (typeof logPayload !== "undefined") {
      logStructuredProviderResponse("builder-reply", logPayload);
    }

    const message =
      typeof providerResult.content === "object" &&
      providerResult.content !== null &&
      "message" in providerResult.content &&
      typeof providerResult.content.message === "string"
        ? providerResult.content.message.trim()
        : "";

    return message || input.fallbackMessage;
  } catch {
    return input.fallbackMessage;
  }
}
