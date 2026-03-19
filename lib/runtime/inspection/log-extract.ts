import type { RuntimeLogEntry } from "@/lib/runtime/logs";

const relevantLogPattern =
  /(error|failed|exception|typeerror|referenceerror|syntaxerror|build|vite|react|cannot read|undefined)/i;

export function extractRelevantLogExcerpt(entries: RuntimeLogEntry[], options: { maxLines?: number; maxChars?: number } = {}) {
  const maxLines = options.maxLines ?? 80;
  const maxChars = options.maxChars ?? 12_000;

  const relevantLines = entries
    .map((entry) => `${entry.stream}: ${entry.message}`)
    .filter((line) => relevantLogPattern.test(line));

  const fallbackLines = entries.map((entry) => `${entry.stream}: ${entry.message}`);
  const lines = (relevantLines.length > 0 ? relevantLines : fallbackLines).slice(-maxLines);

  const excerpt = truncateToChars(lines.join("\n"), maxChars);
  const stackExcerpt = extractStackExcerpt(lines).join("\n");

  return {
    excerpt,
    stackExcerpt: truncateToChars(stackExcerpt, 4_000),
  };
}

function extractStackExcerpt(lines: string[]) {
  const stackLines = lines.filter((line) => /^\s*at\s+/i.test(line) || /(typeerror|referenceerror|syntaxerror)/i.test(line));
  return stackLines.slice(-20);
}

function truncateToChars(value: string, maxChars: number) {
  return value.length <= maxChars ? value : `${value.slice(value.length - maxChars)}`;
}
