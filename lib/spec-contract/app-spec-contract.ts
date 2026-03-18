import {
  appArchetypeValues,
  fieldTypeValues,
  pageLayoutValues,
  pageTypeValues,
  sectionEmphasisValues,
  sectionPlacementValues,
  sectionTypeValues,
} from "@/lib/domain/app-spec/schema";

export function buildAppSpecPromptContract() {
  return [
    "Return one AppSpec object as strict JSON only.",
    "Do not include prose, markdown, or explanations.",
    `Allowed archetypes: ${appArchetypeValues.join(", ")}.`,
    `Allowed field types: ${fieldTypeValues.join(", ")}.`,
    `Allowed page types: ${pageTypeValues.join(", ")}.`,
    `Allowed page layouts: ${pageLayoutValues.join(", ")}.`,
    `Allowed section types: ${sectionTypeValues.join(", ")}.`,
    `Allowed section placement values: ${sectionPlacementValues.join(", ")}.`,
    `Allowed section emphasis values: ${sectionEmphasisValues.join(", ")}.`,
    "Required top-level fields: appId, prompt, title, archetype, entities, navigation, pages.",
    "Maximum entities: 4.",
    "Maximum pages: 5.",
    "Maximum sections per page: 3.",
    "Each navigation item must reference an existing pageId.",
    "Each page entityIds entry must reference an existing entity.",
    "Each section must include entityId. Use null when the section is not tied to an entity.",
    "Each non-null section entityId must reference an existing entity.",
    "Use short product-grade labels, not placeholders.",
    "Choose the app structure yourself from the prompt, but stay within these constraints.",
  ].join("\n");
}

export function buildAppSpecGenerationPrompts(prompt: string) {
  const contract = buildAppSpecPromptContract();

  return {
    systemPrompt: [
      "You generate AppSpec objects for a prototype app builder.",
      "Your only job is to return a valid structured AppSpec proposal.",
      contract,
    ].join("\n\n"),
    userPrompt: [
      `User prompt: ${prompt}`,
      "Generate the best matching AppSpec for this request.",
    ].join("\n\n"),
  };
}

export function buildAppSpecCreatePrompts(prompt: string) {
  const base = buildAppSpecGenerationPrompts(prompt);

  return {
    ...base,
    systemPrompt: [
      base.systemPrompt,
      "This is create mode. Design the app from scratch based on the user prompt.",
    ].join("\n\n"),
  };
}

export const appSpecJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["appId", "prompt", "title", "archetype", "entities", "navigation", "pages"],
  properties: {
    appId: { type: "string", minLength: 1 },
    prompt: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    archetype: { type: "string", enum: [...appArchetypeValues] },
    entities: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "fields"],
        properties: {
          id: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          fields: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["key", "label", "type"],
              properties: {
                key: { type: "string", minLength: 1 },
                label: { type: "string", minLength: 1 },
                type: { type: "string", enum: [...fieldTypeValues] },
              },
            },
          },
        },
      },
    },
    navigation: {
      type: "array",
      minItems: 1,
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
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "pageType", "pageLayout", "entityIds", "sections"],
        properties: {
          id: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 },
          pageType: { type: "string", enum: [...pageTypeValues] },
          pageLayout: { type: "string", enum: [...pageLayoutValues] },
          entityIds: {
            type: "array",
            items: { type: "string", minLength: 1 },
          },
          sections: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
                required: ["id", "type", "title", "entityId", "placement", "emphasis"],
              properties: {
                id: { type: "string", minLength: 1 },
              type: { type: "string", enum: [...sectionTypeValues] },
              title: { type: "string", minLength: 1 },
              entityId: { type: ["string", "null"], minLength: 1 },
              placement: { type: "string", enum: [...sectionPlacementValues] },
              emphasis: { type: "string", enum: [...sectionEmphasisValues] },
            },
          },
          },
        },
      },
    },
  },
};
