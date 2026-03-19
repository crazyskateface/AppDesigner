export type EditModeStrategy = "direct-ui-source-edit" | "app-spec-edit";

const directUiPatterns = [
  /\btestimonials?\b/i,
  /\bquote(?:s| block)?\b/i,
  /\bhappy customers?\b/i,
  /\bpromo(?:tional)? section\b/i,
  /\bhero section\b/i,
  /\bheadline\b/i,
  /\bsubheadline\b/i,
  /\bcontent block\b/i,
  /\btext section\b/i,
  /\bcopy block\b/i,
  /\bcopy\b/i,
  /\btext\b/i,
  /\bembed\b/i,
  /\biframe\b/i,
  /\bvideo\b/i,
  /\bsection\b/i,
  /\blayout\b/i,
  /\bbanner\b/i,
  /\breshuffle\b/i,
  /\breorder\b/i,
  /\bmove\b.+\bsection\b/i,
  /\bcta\b/i,
];

const appSpecPatterns = [
  /\badd (?:a )?(dashboard|settings|calendar|booking|overview) page\b/i,
  /\bnew page\b/i,
  /\brename (?:the )?app\b/i,
  /\bchange archetype\b/i,
  /\badd (?:a )?(table|list|activity|form|stats) section\b/i,
  /\bnavigation\b/i,
  /\bentity\b/i,
  /\bworkflow\b/i,
];

export function resolveEditModeStrategy(prompt: string): EditModeStrategy {
  if (directUiPatterns.some((pattern) => pattern.test(prompt))) {
    return "direct-ui-source-edit";
  }

  if (appSpecPatterns.some((pattern) => pattern.test(prompt))) {
    return "app-spec-edit";
  }

  return "direct-ui-source-edit";
}
