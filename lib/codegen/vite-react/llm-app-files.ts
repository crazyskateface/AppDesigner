import type { GeneratedSourceBundle } from "@/lib/codegen/model";
import { createTemplateViteReactAppFiles } from "@/lib/codegen/vite-react/app-files";
import { buildViteReactSourceBundlePrompts, generatedSourceBundleJsonSchema } from "@/lib/codegen/vite-react/source-bundle-contract";
import { normalizeGeneratedSourceBundleCandidate, validateGeneratedSourceBundleCandidate } from "@/lib/codegen/vite-react/source-bundle-normalize";
import { logStructuredProviderResponse } from "@/lib/llm/debug-log";
import { openAiStructuredObjectProvider } from "@/lib/llm/openai/structured-provider";
import { OpenAiConfigurationError } from "@/lib/llm/openai/client";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import type { ProjectBrief } from "@/lib/planner/project-brief";
import type { WorkspaceFile } from "@/lib/workspace/model";

export type GenerateViteReactAppFilesOptions = {
  provider?: StructuredObjectGenerator;
  fallback?: "none" | "template";
};

export type GenerateViteReactAppFilesResult = {
  bundle: GeneratedSourceBundle;
  files: WorkspaceFile[];
  packageRequirements: NonNullable<GeneratedSourceBundle["packageRequirements"]>;
  generationMeta: {
    source: "llm" | "template-fallback";
    repaired: boolean;
    provider?: {
      name: string;
      model?: string;
    };
    fallbackReason?: "missing_api_key" | "provider_error" | "validation_error";
  };
};

export async function generateViteReactAppFilesFromProjectBrief(
  brief: ProjectBrief,
  options: GenerateViteReactAppFilesOptions = {},
): Promise<GenerateViteReactAppFilesResult> {
  const provider = options.provider ?? openAiStructuredObjectProvider;
  const { systemPrompt, userPrompt } = buildViteReactSourceBundlePrompts(brief);

  try {
    const providerResult = await provider.generateStructuredObject({
      systemPrompt,
      userPrompt,
      schemaName: "vite_react_source_bundle",
      jsonSchema: generatedSourceBundleJsonSchema,
    });

    logStructuredProviderResponse(
      "vite-react-source-bundle",
      providerResult.rawProviderResponseText ?? providerResult.rawText ?? providerResult.content,
    );

    const normalizedCandidate = normalizeGeneratedSourceBundleCandidate(providerResult.content, brief);
    const validation = validateGeneratedSourceBundleCandidate(normalizedCandidate);

    if (!validation.success) {
      if (options.fallback === "template") {
        return createTemplateFallbackResult(brief, "validation_error");
      }

      throw new Error("The generated source bundle could not be validated.");
    }

    return {
      bundle: validation.data,
      files: validation.data.files,
      packageRequirements: validation.data.packageRequirements ?? [],
      generationMeta: {
        source: "llm",
        repaired: serialize(providerResult.content) !== serialize(normalizedCandidate),
        provider: providerResult.provider,
      },
    };
  } catch (error) {
    logStructuredProviderResponse("vite-react-source-bundle", {
      status: "fallback",
      reason: options.fallback === "template"
        ? error instanceof OpenAiConfigurationError
          ? "missing_api_key"
          : "provider_error"
        : "generation_error",
      error: error instanceof Error ? error.message : "The app-specific source files could not be generated.",
    });

    if (options.fallback === "template") {
      const fallbackReason =
        error instanceof OpenAiConfigurationError ? "missing_api_key" : "provider_error";

      return createTemplateFallbackResult(brief, fallbackReason);
    }

    throw error instanceof Error ? error : new Error("The app-specific source files could not be generated.");
  }
}

function createTemplateFallbackResult(
  brief: ProjectBrief,
  fallbackReason: "missing_api_key" | "provider_error" | "validation_error",
): GenerateViteReactAppFilesResult {
  const files = createTemplateViteReactAppFiles(brief);

  return {
    bundle: {
      bundleId: `bundle-${brief.briefId}`,
      targetKind: "vite-react-static",
      entryModule: "src/App.tsx",
      files,
      packageRequirements: [],
      notes: ["Used the explicit template fallback bundle."],
    },
    files,
    packageRequirements: [],
    generationMeta: {
      source: "template-fallback",
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
