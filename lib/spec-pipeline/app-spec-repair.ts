import { normalizePrompt, slugify } from "@/lib/domain/app-spec/parse";

type JsonRecord = Record<string, unknown>;

export function repairAppSpecCandidate(candidate: unknown, prompt: string): unknown {
  if (!isRecord(candidate)) {
    return candidate;
  }

  const entities = Array.isArray(candidate.entities)
    ? candidate.entities
        .filter(isRecord)
        .map((entity, entityIndex) => ({
          ...entity,
          id: ensureId(entity.id, entity.name, `entity-${entityIndex + 1}`),
          name: ensureLabel(entity.name, entity.id, `Entity ${entityIndex + 1}`),
          fields: Array.isArray(entity.fields)
            ? entity.fields
                .filter(isRecord)
                .map((field, fieldIndex) => ({
                  ...field,
                  key: ensureId(field.key, field.label, `field-${fieldIndex + 1}`),
                  label: ensureLabel(field.label, field.key, `Field ${fieldIndex + 1}`),
                }))
            : entity.fields,
        }))
    : candidate.entities;

  const entityIds = new Set(
    Array.isArray(entities)
      ? entities
          .map((entity) => (isRecord(entity) && typeof entity.id === "string" ? entity.id : null))
          .filter((value): value is string => Boolean(value))
      : [],
  );

  const pages = Array.isArray(candidate.pages)
    ? candidate.pages
        .filter(isRecord)
        .map((page, pageIndex) => {
          const repairedSections = Array.isArray(page.sections)
            ? page.sections
                .filter(isRecord)
                .map((section, sectionIndex) => ({
                  ...section,
                  id: ensureId(section.id, section.title ?? section.type, `section-${sectionIndex + 1}`),
                  type: section.type,
                  title: ensureLabel(section.title, section.id ?? section.type, `Section ${sectionIndex + 1}`),
                  entityId:
                    typeof section.entityId === "string" && entityIds.has(section.entityId) ? section.entityId : undefined,
                  placement: typeof section.placement === "string" ? section.placement : "main",
                  emphasis: typeof section.emphasis === "string" ? section.emphasis : "default",
                }))
                .filter((section) => typeof section.type === "string")
            : page.sections;

          return {
            ...page,
            id: ensureId(page.id, page.title, `page-${pageIndex + 1}`),
            title: ensureLabel(page.title, page.id, `Page ${pageIndex + 1}`),
            entityIds: Array.isArray(page.entityIds)
              ? page.entityIds.filter((entityId): entityId is string => typeof entityId === "string" && entityIds.has(entityId))
              : page.entityIds,
            sections: repairedSections,
          };
        })
    : candidate.pages;

  const validPages = Array.isArray(pages)
    ? pages.filter((page) => Array.isArray(page.sections) && page.sections.length > 0)
    : pages;

  const navigation = Array.isArray(validPages)
    ? validPages
        .filter(isRecord)
        .map((page) => ({
          id: `${page.id}-nav`,
          label: ensureLabel(page.title, page.id, "Page"),
          pageId: page.id,
        }))
    : candidate.navigation;

  return {
    ...candidate,
    appId: ensureId(candidate.appId, candidate.title, "generated-app"),
    prompt: normalizePrompt(prompt),
    title: ensureLabel(candidate.title, candidate.appId, "Generated App"),
    entities,
    pages: validPages,
    navigation,
  };
}

function ensureId(value: unknown, fallbackSource: unknown, fallback: string) {
  const source =
    typeof value === "string" && value.trim()
      ? value
      : typeof fallbackSource === "string" && fallbackSource.trim()
        ? fallbackSource
        : fallback;

  return slugify(source) || fallback;
}

function ensureLabel(value: unknown, fallbackSource: unknown, fallback: string) {
  const source =
    typeof value === "string" && value.trim()
      ? value.trim()
      : typeof fallbackSource === "string" && fallbackSource.trim()
        ? titleCase(fallbackSource)
        : fallback;

  return source.replace(/\s+/g, " ");
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
