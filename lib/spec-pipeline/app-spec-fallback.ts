import type { AppSpec } from "@/lib/domain/app-spec";
import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";

export function createFallbackAppSpec(prompt: string): AppSpec {
  return generateFallbackAppSpec(prompt);
}
