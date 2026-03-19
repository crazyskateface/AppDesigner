export type EditModeStrategy = "direct-ui-source-edit" | "out-of-scope";

const outOfScopePatterns = [
  /\b(?:add|install|update|upgrade)\b.+\b(?:package|dependency|dependencies|npm|yarn)\b/i,
  /\bpackage\.json\b/i,
  /\bvite\.config\b/i,
  /\btailwind\.config\b/i,
  /\btsconfig\b/i,
  /\bDockerfile\b/i,
  /\bdocker[- ]?compose\b/i,
  /\b\.env\b/i,
  /\benvironment variable/i,
  /\bbackend\b/i,
  /\bserver[- ]?side\b/i,
  /\bapi (?:route|endpoint|server)\b/i,
  /\bdatabase\b/i,
  /\bsupabase\b/i,
  /\bfirebase\b/i,
  /\bstripe\b/i,
  /\bcheckout\b/i,
  /\boauth\b/i,
  /\bgoogle login\b/i,
  /\bauthentication\b/i,
  /\bimage upload\b.+\bstorage\b/i,
  /\bbuild pipeline\b/i,
  /\bci\/?cd\b/i,
  /\bdeployment\b/i,
];

export function resolveEditModeStrategy(prompt: string): EditModeStrategy {
  if (outOfScopePatterns.some((pattern) => pattern.test(prompt))) {
    return "out-of-scope";
  }

  return "direct-ui-source-edit";
}
