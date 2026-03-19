export function buildProjectBriefPromptContract() {
  return [
    "Return one ProjectBrief object as strict JSON only.",
    "Do not include prose, markdown, or explanations.",
    "The brief is for a local-first AI coding orchestrator, not a no-code form builder.",
    "Choose the app title, navigation, pages, and section groupings yourself based on the user prompt.",
    "Required top-level fields: briefId, title, prompt, summary, targetKind, navigation, pages, constraints, source.",
    "targetKind must be vite-react-static.",
    "source.kind must be llm-plan.",
    "Maximum pages: 6.",
    "Maximum navigation items: 6.",
    "Maximum sectionTitles per page: 6.",
    "Each navigation item pageId must reference an existing page id.",
    "Use short product-grade labels and summaries.",
    "Make the plan feel like the first credible version of a real product, not a toy demo.",
  ].join("\n");
}

import { formatPromptContextForLlm, type PromptContextEnvelope } from "@/lib/planner/prompt-context";

export function buildProjectBriefPrompts(context: string | PromptContextEnvelope) {
  const contract = buildProjectBriefPromptContract();
  const promptBlock = typeof context === "string" ? `User prompt: ${context}` : formatPromptContextForLlm(context);

  return {
    systemPrompt: [
      "You are planning a runnable software project for an AI coding orchestrator.",
      "Your job is to create the project brief that later code-generation stages will implement.",
      contract,
    ].join("\n\n"),
    userPrompt: [
      promptBlock,
      "Generate the best ProjectBrief for this request.",
    ].join("\n\n"),
  };
}

export const projectBriefJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["briefId", "title", "prompt", "summary", "targetKind", "navigation", "pages", "constraints", "source"],
  properties: {
    briefId: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    prompt: { type: "string", minLength: 1 },
    summary: { type: "string", minLength: 1 },
    targetKind: { type: "string", enum: ["vite-react-static"] },
    navigation: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "pageId"],
        properties: {
          id: { type: "string", minLength: 1 },
          label: { type: "string", minLength: 1 },
          pageId: { type: "string", minLength: 1 },
        },
      },
    },
    pages: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "pageType", "summary", "sectionTitles"],
        properties: {
          id: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 },
          pageType: { type: "string", minLength: 1 },
          summary: { type: "string", minLength: 1 },
          sectionTitles: {
            type: "array",
            maxItems: 6,
            items: { type: "string", minLength: 1 },
          },
        },
      },
    },
    constraints: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string", minLength: 1 },
    },
    source: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "referenceId"],
      properties: {
        kind: { type: "string", enum: ["llm-plan"] },
        referenceId: { type: "string", minLength: 1 },
      },
    },
  },
};
