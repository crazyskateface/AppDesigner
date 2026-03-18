import type { AppArchetype } from "@/lib/domain/app-spec/schema";

export const archetypeKeywords: Record<AppArchetype, string[]> = {
  crm: ["crm", "lead", "pipeline", "deal", "prospect", "sales", "follow-up", "client"],
  booking: ["booking", "appointment", "reservation", "schedule", "calendar", "session", "class"],
  creator: ["creator", "content", "newsletter", "sponsor", "audience", "campaign", "channel"],
  inventory: ["inventory", "stock", "sku", "supplier", "warehouse", "purchase order", "purchase-order"],
};

export const strongKeywords = new Set([
  "crm",
  "booking",
  "creator",
  "inventory",
  "newsletter",
  "sku",
  "reservation",
  "pipeline",
]);
