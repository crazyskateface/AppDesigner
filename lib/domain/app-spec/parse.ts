import { archetypeTemplates } from "@/lib/domain/app-spec/archetypes";
import { archetypeKeywords, strongKeywords } from "@/lib/domain/app-spec/keywords";
import type { AppArchetype } from "@/lib/domain/app-spec/schema";

export function normalizePrompt(prompt: string) {
  return prompt.trim().replace(/\s+/g, " ");
}

export function detectArchetype(prompt: string): AppArchetype {
  const loweredPrompt = prompt.toLowerCase();

  const ranked = (Object.keys(archetypeKeywords) as AppArchetype[]).map((archetype) => {
    const score = archetypeKeywords[archetype].reduce((total, keyword) => {
      if (!loweredPrompt.includes(keyword)) {
        return total;
      }

      return total + (strongKeywords.has(keyword) ? 3 : 1);
    }, 0);

    return { archetype, score };
  });

  ranked.sort((left, right) => right.score - left.score);

  return ranked[0]?.score ? ranked[0].archetype : "crm";
}

export function extractQuotedName(prompt: string) {
  return prompt.match(/["“](.+?)["”]/)?.[1]?.trim() ?? null;
}

export function extractAudiencePhrase(prompt: string) {
  const match = prompt.match(/\bfor\s+([a-z0-9 ,&-]+)/i);
  const rawAudience = match?.[1]?.split(/[.,]/)[0]?.trim();

  if (!rawAudience) {
    return null;
  }

  const trimmedAudience = rawAudience.split(/\bto\b/i)[0]?.trim();
  return trimmedAudience ? trimmedAudience.replace(/^(a|an|the)\s+/i, "").trim() : null;
}

export function deriveTitle(prompt: string, archetype: AppArchetype) {
  const quotedName = extractQuotedName(prompt);

  if (quotedName) {
    return titleCase(quotedName);
  }

  const audience = extractAudiencePhrase(prompt);

  if (audience) {
    const suffix = archetypeTitleSuffix[archetype];
    return `${titleCase(audience)} ${suffix}`;
  }

  return archetypeTemplates[archetype].defaultTitle;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const archetypeTitleSuffix: Record<AppArchetype, string> = {
  crm: "CRM",
  booking: "Booking",
  creator: "Dashboard",
  inventory: "Inventory",
};
