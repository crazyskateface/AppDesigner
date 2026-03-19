import { normalizePrompt } from "@/lib/domain/app-spec/parse";
import { logStructuredProviderResponse } from "@/lib/llm/debug-log";
import { openAiStructuredObjectProvider } from "@/lib/llm/openai/structured-provider";
import { OpenAiConfigurationError } from "@/lib/llm/openai/client";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { buildPromptContextEnvelope, type PromptContextEnvelope } from "@/lib/planner/prompt-context";
import { buildProjectBriefPrompts, projectBriefJsonSchema } from "@/lib/planner/project-brief-contract";
import { normalizeProjectBriefCandidate, validateProjectBriefCandidate } from "@/lib/planner/project-brief-normalize";
import type { ProjectBrief } from "@/lib/planner/project-brief";

export type GenerateProjectBriefOptions = {
  provider?: StructuredObjectGenerator;
};

export type GenerateProjectBriefResult = {
  projectBrief: ProjectBrief;
  generationMeta: {
    source: "llm";
    repaired: boolean;
    provider?: {
      name: string;
      model?: string;
    };
  };
};

export async function generateProjectBriefFromPrompt(
  prompt: string | PromptContextEnvelope,
  options: GenerateProjectBriefOptions = {},
): Promise<GenerateProjectBriefResult> {
  const context = typeof prompt === "string" ? buildPromptContextEnvelope({ prompt }) : prompt;
  const normalizedPrompt = typeof prompt === "string" ? normalizePrompt(prompt) : prompt.prompt;
  const provider = options.provider ?? openAiStructuredObjectProvider;
  const { systemPrompt, userPrompt } = buildProjectBriefPrompts(context);

  try {
    const providerResult = await provider.generateStructuredObject({
      systemPrompt,
      userPrompt,
      schemaName: "project_brief",
      jsonSchema: projectBriefJsonSchema,
    });

    logStructuredProviderResponse(
      "project-brief",
      providerResult.rawProviderResponseText ?? providerResult.rawText ?? providerResult.content,
    );

    const normalizedCandidate = normalizeProjectBriefCandidate(providerResult.content, normalizedPrompt);
    const finalValidation = validateProjectBriefCandidate(normalizedCandidate);

    if (!finalValidation.success) {
      throw new Error("The generated project brief could not be validated.");
    }

    return {
      projectBrief: finalValidation.data,
      generationMeta: {
        source: "llm",
        repaired: serialize(providerResult.content) !== serialize(normalizedCandidate),
        provider: providerResult.provider,
      },
    };
  } catch (error) {
    if (error instanceof OpenAiConfigurationError) {
      throw error;
    }

    throw error instanceof Error ? error : new Error("The project brief could not be generated.");
  }
}

function serialize(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}
