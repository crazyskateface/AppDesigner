import { OpenAiConfigurationError } from "@/lib/llm/openai/client";
import { openAiStructuredObjectProvider } from "@/lib/llm/openai/structured-provider";
import { logStructuredProviderResponse } from "@/lib/llm/debug-log";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { buildClarificationPrompts, clarificationDecisionJsonSchema } from "@/lib/planner/clarification/contract";
import {
  normalizeClarificationDecisionCandidate,
  validateClarificationDecisionCandidate,
} from "@/lib/planner/clarification/normalize";
import type { ClarificationDecision } from "@/lib/planner/clarification/types";
import type { PromptContextEnvelope } from "@/lib/planner/prompt-context";

export type DecideClarificationOptions = {
  provider?: StructuredObjectGenerator;
};

export async function decideClarificationForPromptContext(
  context: PromptContextEnvelope,
  options: DecideClarificationOptions = {},
): Promise<ClarificationDecision> {
  const provider = options.provider ?? openAiStructuredObjectProvider;
  const { systemPrompt, userPrompt } = buildClarificationPrompts(context);

  try {
    const providerResult = await provider.generateStructuredObject({
      systemPrompt,
      userPrompt,
      schemaName: "clarification_decision",
      jsonSchema: clarificationDecisionJsonSchema,
    });

    logStructuredProviderResponse(
      "clarification",
      providerResult.rawProviderResponseText ?? providerResult.rawText ?? providerResult.content,
    );

    const normalizedCandidate = normalizeClarificationDecisionCandidate(providerResult.content, context);
    const validation = validateClarificationDecisionCandidate(normalizedCandidate);

    if (!validation.success) {
      return createDefaultBuildNowDecision(context);
    }

    return validation.data;
  } catch (error) {
    if (error instanceof OpenAiConfigurationError) {
      return createDefaultBuildNowDecision(context);
    }

    return createDefaultBuildNowDecision(context);
  }
}

function createDefaultBuildNowDecision(context: PromptContextEnvelope): ClarificationDecision {
  return {
    decision: "build-now",
    summary: context.clarificationAnswers.length
      ? "The builder did not get an explicit clarification request from the model, so it will proceed with the provided context."
      : "The builder did not get an explicit clarification request from the model, so it will proceed directly into planning.",
    questions: [],
  };
}
