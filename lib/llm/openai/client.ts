const openAiApiUrl = "https://api.openai.com/v1/chat/completions";

export const defaultOpenAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-4.1";

type OpenAiChatCompletionResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

export class OpenAiConfigurationError extends Error {}

export async function createOpenAiChatCompletion(body: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new OpenAiConfigurationError("Missing OPENAI_API_KEY.");
  }

  const response = await fetch(openAiApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json()) as OpenAiChatCompletionResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenAI request failed.");
  }

  return payload;
}
