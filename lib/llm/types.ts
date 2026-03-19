export type StructuredGenerationRequest = {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
};

export type StructuredGenerationResult = {
  content: unknown;
  rawText?: string;
  rawProviderResponseText?: string;
  provider: {
    name: string;
    model?: string;
  };
};

export interface StructuredObjectGenerator {
  generateStructuredObject(input: StructuredGenerationRequest): Promise<StructuredGenerationResult>;
}
