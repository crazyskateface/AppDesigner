export type EditModeStrategy = "direct-ui-source-edit" | "app-spec-edit";

const directUiPatterns = [
  /\btestimonials?\b/i,
  /\bquote(?:s| block)?\b/i,
  /\bhappy customers?\b/i,
  /\bpromo(?:tional)? section\b/i,
  /\bhero section\b/i,
  /\bcontent block\b/i,
  /\btext section\b/i,
  /\bcopy block\b/i,
  /\bembed\b/i,
  /\biframe\b/i,
  /\bvideo\b/i,
  /\bsection\b/i,
  /\blayout\b/i,
  /\bbanner\b/i,
];

export function resolveEditModeStrategy(prompt: string): EditModeStrategy {
  return directUiPatterns.some((pattern) => pattern.test(prompt)) ? "direct-ui-source-edit" : "app-spec-edit";
}
