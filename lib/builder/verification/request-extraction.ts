import {
  requestedCodeEditKindSchema,
  type RequestedCodeArtifactHint,
} from "@/lib/builder/verification/schema";

function normalizePrompt(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim();
}

function extractQuotedNames(prompt: string) {
  const names = new Set<string>();

  for (const match of prompt.matchAll(/[`"'“”]([A-Za-z][\w.-]+(?:\.[A-Za-z]+)?)['"`“”]/g)) {
    const name = match[1]?.trim();
    if (name) {
      names.add(name);
    }
  }

  return [...names];
}

function extractNamedArtifacts(prompt: string) {
  const hints: RequestedCodeArtifactHint[] = [];
  const quotedNames = extractQuotedNames(prompt);

  for (const name of quotedNames) {
    const lower = name.toLowerCase();
    hints.push({
      kind: name.includes(".") ? "file" : lower.includes("page") ? "page" : "symbol",
      name,
    });
  }

  for (const match of prompt.matchAll(/\b([A-Z][A-Za-z0-9]+)\s+(component|page|hook|file)\b/g)) {
    const name = match[1]?.trim();
    const kind = match[2]?.toLowerCase();

    if (!name || !kind) {
      continue;
    }

    hints.push({
      kind: kind === "component" ? "component" : kind === "page" ? "page" : kind === "file" ? "file" : "symbol",
      name,
    });
  }

  if (/\bcomponents?\b/i.test(prompt) && !hints.some((hint) => hint.kind === "component")) {
    hints.push({
      kind: "component",
      name: null,
    });
  }

  if (/\bpages?\b/i.test(prompt) && !hints.some((hint) => hint.kind === "page")) {
    hints.push({
      kind: "page",
      name: null,
    });
  }

  if (/\bfiles?\b/i.test(prompt) && !hints.some((hint) => hint.kind === "file")) {
    hints.push({
      kind: "file",
      name: null,
    });
  }

  const deduped = new Map<string, RequestedCodeArtifactHint>();
  for (const hint of hints) {
    deduped.set(`${hint.kind}:${(hint.name ?? "").toLowerCase()}`, hint);
  }

  return [...deduped.values()];
}

export function extractRequestedCodeEdit(prompt: string) {
  const normalizedPrompt = normalizePrompt(prompt);

  const requestedEditKind = requestedCodeEditKindSchema.parse(
    /\b(add|create|new)\b/i.test(normalizedPrompt) && /\b(component|page|file|hook)\b/i.test(normalizedPrompt)
      ? "create-file"
      : /\b(update|edit|modify|change|replace)\b/i.test(normalizedPrompt)
        ? "update-file"
        : /\b(refactor|rework|reorganize)\b/i.test(normalizedPrompt)
          ? "multi-file-edit"
          : "unknown",
  );

  return {
    requestSummary: normalizedPrompt,
    requestedEditKind,
    requestedArtifactHints: extractNamedArtifacts(normalizedPrompt),
  };
}
