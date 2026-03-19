import { normalizePrompt } from "@/lib/domain/app-spec/parse";
import {
  appSpecSchema,
  type AppSpec,
  type BuilderMode,
  type AppSpecGenerationMeta,
  type GenerateAppSpecResponse,
} from "@/lib/domain/app-spec/schema";
import { openAiStructuredObjectProvider } from "@/lib/llm/openai/structured-provider";
import { OpenAiConfigurationError } from "@/lib/llm/openai/client";
import { logStructuredProviderResponse } from "@/lib/llm/debug-log";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { formatPromptContextForLlm, type PromptContextEnvelope } from "@/lib/planner/prompt-context";
import { appSpecJsonSchema, buildAppSpecCreatePrompts } from "@/lib/spec-contract/app-spec-contract";
import { buildAppSpecEditInstructions, buildAppSpecEditPromptContext } from "@/lib/spec-contract/app-spec-edit-contract";
import { createFallbackAppSpec } from "@/lib/spec-pipeline/app-spec-fallback";
import { normalizeAppSpecCandidate } from "@/lib/spec-pipeline/app-spec-normalize";
import { parseAppSpecCandidate } from "@/lib/spec-pipeline/app-spec-parser";
import { repairAppSpecCandidate } from "@/lib/spec-pipeline/app-spec-repair";

type GenerateAppSpecOptions = {
  provider?: StructuredObjectGenerator;
  mode?: BuilderMode;
  currentSpec?: AppSpec;
};

export async function generateAppSpecFromPrompt(
  prompt: string | PromptContextEnvelope,
  options: GenerateAppSpecOptions = {},
): Promise<GenerateAppSpecResponse> {
  const normalizedPrompt = typeof prompt === "string" ? normalizePrompt(prompt) : prompt.prompt;
  const provider = options.provider ?? openAiStructuredObjectProvider;
  const mode = options.mode ?? "create";
  const promptContext =
    typeof prompt === "string"
      ? undefined
      : prompt;
  const { systemPrompt, userPrompt } = buildPrompts(normalizedPrompt, mode, options.currentSpec, promptContext);

  try {
    const providerResult = await provider.generateStructuredObject({
      systemPrompt,
      userPrompt,
      schemaName: "app_spec",
      jsonSchema: appSpecJsonSchema,
    });

    logStructuredProviderResponse(
      "app-spec",
      providerResult.rawProviderResponseText ?? providerResult.rawText ?? providerResult.content,
    );

    const parsedCandidate = parseAppSpecCandidate(providerResult.content);
    const initialValidation = appSpecSchema.safeParse(parsedCandidate);
    const normalizedCandidate = normalizeAppSpecCandidate(
      initialValidation.success ? initialValidation.data : parsedCandidate,
      normalizedPrompt,
    );
    const repairedCandidate = repairAppSpecCandidate(normalizedCandidate, normalizedPrompt);
    const finalValidation = appSpecSchema.safeParse(repairedCandidate);

    if (!finalValidation.success) {
      if (mode === "edit") {
        throw new Error("The updated app spec could not be validated.");
      }

      return fallbackResult(normalizedPrompt, "validation_error");
    }

    return {
      appSpec: finalValidation.data,
      generationMeta: {
        source: "llm",
        repaired: serialize(parsedCandidate) !== serialize(repairedCandidate),
        provider: providerResult.provider,
      },
    };
  } catch (error) {
    if (mode === "edit") {
      throw error instanceof Error ? error : new Error("The app update could not be applied.");
    }

    if (error instanceof SyntaxError) {
      return fallbackResult(normalizedPrompt, "parse_error");
    }

    if (error instanceof OpenAiConfigurationError) {
      return fallbackResult(normalizedPrompt, "missing_api_key");
    }

    return fallbackResult(normalizedPrompt, "provider_error");
  }
}

function buildPrompts(prompt: string, mode: BuilderMode, currentSpec?: AppSpec, promptContext?: PromptContextEnvelope) {
  const contextBlock = promptContext ? `Planning context:\n${formatPromptContextForLlm(promptContext)}` : undefined;

  if (mode === "edit" && currentSpec) {
    const createPrompts = buildAppSpecCreatePrompts(prompt);

    return {
      systemPrompt: [createPrompts.systemPrompt, buildAppSpecEditInstructions()].join("\n\n"),
      userPrompt: [
        createPrompts.userPrompt,
        contextBlock,
        "Current AppSpec:",
        buildAppSpecEditPromptContext(currentSpec),
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  const prompts = buildAppSpecCreatePrompts(prompt);

  if (!contextBlock) {
    return prompts;
  }

  return {
    systemPrompt: prompts.systemPrompt,
    userPrompt: [prompts.userPrompt, contextBlock].join("\n\n"),
  };
}

function fallbackResult(
  prompt: string,
  fallbackReason: AppSpecGenerationMeta["fallbackReason"],
): GenerateAppSpecResponse {
  return {
    appSpec: createFallbackAppSpec(prompt),
    generationMeta: {
      source: "fallback",
      repaired: false,
      fallbackReason,
    },
  };
}

function serialize(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}
