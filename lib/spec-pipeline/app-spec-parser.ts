export function parseAppSpecCandidate(raw: unknown) {
  if (typeof raw === "string") {
    return JSON.parse(raw) as unknown;
  }

  return raw;
}
