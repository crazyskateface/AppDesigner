import type { RuntimeFailure } from "@/lib/runtime/logs";

export function createFailureSignature(input: {
  failure?: RuntimeFailure;
  logExcerpt?: string;
}) {
  const code = input.failure?.code ?? "unknown";
  const message = normalizeSignaturePart(input.failure?.message ?? "");
  const excerpt = normalizeSignaturePart(input.logExcerpt ?? "");

  return [code, message, excerpt].filter(Boolean).join("|") || "unknown";
}

function normalizeSignaturePart(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}
