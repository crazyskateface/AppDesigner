import type { AppSpec } from "@/lib/domain/app-spec";

export function getEditGenerationNoopMessage(currentSpec: AppSpec, nextSpec: AppSpec, prompt: string) {
  if (!areAppSpecsEquivalent(currentSpec, nextSpec)) {
    return null;
  }

  void prompt;

  return "No supported structural change was produced from that prompt, so the app was left unchanged.";
}

function areAppSpecsEquivalent(left: AppSpec, right: AppSpec) {
  return serialize(left) === serialize(right);
}

function serialize(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}
