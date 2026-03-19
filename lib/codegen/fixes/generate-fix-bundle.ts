import { openAiStructuredObjectProvider } from "@/lib/llm/openai/structured-provider";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import type { DiagnosticArtifact } from "@/lib/runtime/diagnostics/diagnostic-artifact";
import { buildFixBundlePrompts, generatedFixBundleJsonSchema } from "@/lib/codegen/fixes/fix-bundle-contract";
import { normalizeGeneratedFixBundleCandidate, validateGeneratedFixBundleCandidate } from "@/lib/codegen/fixes/fix-bundle-normalize";
import type { GeneratedFixBundle } from "@/lib/codegen/fixes/fix-bundle-model";

export async function generateFixBundleFromDiagnostic(
  diagnostic: DiagnosticArtifact,
  options: {
    provider?: StructuredObjectGenerator;
  } = {},
): Promise<{
  fixBundle: GeneratedFixBundle;
  provider?: {
    name: string;
    model?: string;
  };
  repaired: boolean;
}> {
  const provider = options.provider ?? openAiStructuredObjectProvider;
  const { systemPrompt, userPrompt } = buildFixBundlePrompts(diagnostic);

  const providerResult = await provider.generateStructuredObject({
    systemPrompt,
    userPrompt,
    schemaName: "generated_fix_bundle",
    jsonSchema: generatedFixBundleJsonSchema,
  });

  const normalizedCandidate = normalizeGeneratedFixBundleCandidate(providerResult.content, diagnostic);
  const validation = validateGeneratedFixBundleCandidate(normalizedCandidate);

  if (!validation.success) {
    throw new Error("The generated fix bundle could not be validated.");
  }

  return {
    fixBundle: validation.data,
    provider: providerResult.provider,
    repaired: serialize(providerResult.content) !== serialize(normalizedCandidate),
  };
}

function serialize(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}
