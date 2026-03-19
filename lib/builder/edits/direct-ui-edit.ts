import { logStructuredProviderResponse } from "@/lib/llm/debug-log";
import { openAiStructuredObjectProvider } from "@/lib/llm/openai/structured-provider";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import type { WorkspaceFile } from "@/lib/workspace/model";

import {
  buildDirectUiEditPrompts,
  directUiEditJsonSchema,
  directUiEditResultSchema,
} from "@/lib/builder/edits/direct-ui-edit-contract";

export async function generateDirectUiEdit(
  input: {
    prompt: string;
    currentFiles: WorkspaceFile[];
    appTitle: string;
  },
  options: {
    provider?: StructuredObjectGenerator;
  } = {},
) {
  const provider = options.provider ?? openAiStructuredObjectProvider;
  const { systemPrompt, userPrompt } = buildDirectUiEditPrompts(input);
  const providerResult = await provider.generateStructuredObject({
    systemPrompt,
    userPrompt,
    schemaName: "direct_ui_edit",
    jsonSchema: directUiEditJsonSchema,
  });

  logStructuredProviderResponse(
    "direct-ui-edit",
    providerResult.rawProviderResponseText ?? providerResult.rawText ?? providerResult.content,
  );

  return directUiEditResultSchema.parse(providerResult.content);
}
