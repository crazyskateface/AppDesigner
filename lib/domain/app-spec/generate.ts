import { archetypeTemplates } from "@/lib/domain/app-spec/archetypes";
import { appSpecSchema, type AppSpec, type AppSpecPage, type EntityConfig } from "@/lib/domain/app-spec/schema";
import { detectArchetype, deriveTitle, normalizePrompt, slugify } from "@/lib/domain/app-spec/parse";

export function generateFallbackAppSpec(prompt: string): AppSpec {
  const normalizedPrompt = normalizePrompt(prompt);
  const archetype = detectArchetype(normalizedPrompt);
  const title = deriveTitle(normalizedPrompt, archetype);
  const entities = deriveEntities(normalizedPrompt, archetype);
  const pages = buildPages(archetype, entities);
  const navigation = pages.map((page) => ({
    id: `${page.id}-nav`,
    label: page.title,
    pageId: page.id,
  }));

  return appSpecSchema.parse({
    appId: slugify(title) || archetype,
    prompt: normalizedPrompt,
    title,
    archetype,
    entities,
    navigation,
    pages,
  });
}

export const generateAppSpec = generateFallbackAppSpec;

function deriveEntities(prompt: string, archetype: AppSpec["archetype"]): EntityConfig[] {
  const template = archetypeTemplates[archetype];
  const loweredPrompt = prompt.toLowerCase();

  const pickedEntities = template.entities.filter((entity, index) => {
    if (index < 2) {
      return true;
    }

    if (!entity.keywords?.length) {
      return true;
    }

    return entity.keywords.some((keyword) => loweredPrompt.includes(keyword));
  });

  return pickedEntities.slice(0, 4).map((entity) => ({
    id: entity.id,
    name: entity.name,
    fields: entity.fields,
  }));
}

function buildPages(archetype: AppSpec["archetype"], entities: EntityConfig[]): AppSpecPage[] {
  const template = archetypeTemplates[archetype];
  const entityIds = new Set(entities.map((entity) => entity.id));

  return template.pages.map((page) => ({
    id: page.id,
    title: page.title,
    pageType: page.pageType,
    pageLayout: page.pageLayout,
    entityIds: page.entityIds.filter((entityId) => entityIds.has(entityId)),
    sections: page.sections
      .filter((section) => !section.entityId || entityIds.has(section.entityId))
      .map((section) => ({
        id: section.id,
        type: section.type,
        title: section.title,
        entityId: section.entityId,
        placement: section.placement ?? "main",
        emphasis: section.emphasis ?? "default",
      })),
  }));
}
