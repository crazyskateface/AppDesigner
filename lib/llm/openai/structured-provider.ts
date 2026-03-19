import { createOpenAiChatCompletion, defaultOpenAiModel } from "@/lib/llm/openai/client";
import type { StructuredGenerationRequest, StructuredGenerationResult, StructuredObjectGenerator } from "@/lib/llm/types";

export class OpenAiStructuredObjectProvider implements StructuredObjectGenerator {
  async generateStructuredObject({
    systemPrompt,
    userPrompt,
    schemaName,
    jsonSchema,
  }: StructuredGenerationRequest): Promise<StructuredGenerationResult> {
    const completion = await createOpenAiChatCompletion({
      model: defaultOpenAiModel,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: jsonSchema,
        },
      },
    });

    const payload = completion.payload;

    const content = payload.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      throw new Error("OpenAI returned an empty structured response.");
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("OpenAI returned invalid JSON.");
    }

    return {
      content: parsed,
      rawText: content,
      rawProviderResponseText: completion.rawText,
      provider: {
        name: "openai",
        model: payload.model ?? defaultOpenAiModel,
      },
    };
  }
}

export const openAiStructuredObjectProvider = new OpenAiStructuredObjectProvider();
