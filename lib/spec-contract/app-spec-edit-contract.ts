import type { AppSpec } from "@/lib/domain/app-spec";

export function buildAppSpecEditPromptContext(currentSpec: AppSpec) {
  return JSON.stringify(currentSpec, null, 2);
}

export function buildAppSpecEditInstructions() {
  return [
    "You are editing an existing AppSpec, not designing a brand new app unless the user clearly asks for a major pivot.",
    "Preserve existing entities, pages, navigation, and sections when they still make sense.",
    "Apply the user's requested changes to the current app structure.",
    "Return a complete updated AppSpec object, not a partial patch.",
    "Do not remove valid existing structure unless the prompt implies that it should change.",
  ].join("\n");
}
