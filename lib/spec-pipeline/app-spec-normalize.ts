import {
  appArchetypeValues,
  fieldTypeValues,
  pageLayoutValues,
  pageTypeValues,
  sectionEmphasisValues,
  sectionPlacementValues,
  sectionTypeValues,
} from "@/lib/domain/app-spec/schema";
import { normalizePrompt, slugify } from "@/lib/domain/app-spec/parse";

type JsonRecord = Record<string, unknown>;

const allowedArchetypes = new Set(appArchetypeValues);
const allowedFieldTypes = new Set(fieldTypeValues);
const allowedPageTypes = new Set(pageTypeValues);
const allowedPageLayouts = new Set(pageLayoutValues);
const allowedSectionTypes = new Set(sectionTypeValues);
const allowedSectionPlacement = new Set(sectionPlacementValues);
const allowedSectionEmphasis = new Set(sectionEmphasisValues);

export function normalizeAppSpecCandidate(candidate: unknown, prompt: string): unknown {
  if (!isRecord(candidate)) {
    return candidate;
  }

  return {
    ...candidate,
    appId: normalizeId(candidate.appId, candidate.title),
    prompt: normalizePrompt(prompt),
    title: normalizeLabel(candidate.title),
    archetype: normalizeEnum(candidate.archetype, allowedArchetypes),
    entities: normalizeEntities(candidate.entities),
    navigation: normalizeNavigation(candidate.navigation),
    pages: normalizePages(candidate.pages),
  };
}

function normalizeEntities(value: unknown) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.slice(0, 4).map((entry) => {
    if (!isRecord(entry)) {
      return entry;
    }

    return {
      ...entry,
      id: normalizeId(entry.id, entry.name),
      name: normalizeLabel(entry.name),
      fields: Array.isArray(entry.fields)
        ? entry.fields
            .map((field) => {
              if (!isRecord(field)) {
                return field;
              }

              return {
                ...field,
                key: normalizeId(field.key, field.label),
                label: normalizeLabel(field.label),
                type: normalizeEnum(field.type, allowedFieldTypes),
              };
            })
            .filter(Boolean)
        : entry.fields,
    };
  });
}

function normalizeNavigation(value: unknown) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      return entry;
    }

    return {
      ...entry,
      id: normalizeId(entry.id, entry.label ?? entry.pageId),
      label: normalizeLabel(entry.label),
      pageId: normalizeId(entry.pageId, entry.label),
    };
  });
}

function normalizePages(value: unknown) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.slice(0, 5).map((entry) => {
    if (!isRecord(entry)) {
      return entry;
    }

    const entityIds = Array.isArray(entry.entityIds)
      ? entry.entityIds.map((entityId) => normalizeId(entityId, entityId)).filter(Boolean)
      : entry.entityIds;

    return {
      ...entry,
      id: normalizeId(entry.id, entry.title),
      title: normalizeLabel(entry.title),
      pageType: normalizeEnum(entry.pageType, allowedPageTypes),
      pageLayout: normalizeEnum(entry.pageLayout, allowedPageLayouts),
      entityIds,
      sections: Array.isArray(entry.sections)
        ? entry.sections.slice(0, 3).map((section) => {
            if (!isRecord(section)) {
              return section;
            }

            return {
              ...section,
              id: normalizeId(section.id, section.title ?? section.type),
              title: normalizeLabel(section.title),
              entityId: normalizeId(section.entityId, section.entityId),
              type: normalizeEnum(section.type, allowedSectionTypes),
              placement: normalizeEnum(section.placement, allowedSectionPlacement) ?? "main",
              emphasis: normalizeEnum(section.emphasis, allowedSectionEmphasis) ?? "default",
            };
          })
        : entry.sections,
    };
  });
}

function normalizeLabel(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
}

function normalizeId(value: unknown, fallbackSource: unknown) {
  const source =
    typeof value === "string" && value.trim()
      ? value
      : typeof fallbackSource === "string" && fallbackSource.trim()
        ? fallbackSource
        : null;

  if (!source) {
    return value;
  }

  const slug = slugify(String(source));
  return slug || value;
}

function normalizeEnum<T extends string>(value: unknown, allowed: Set<T>) {
  if (typeof value !== "string") {
    return value;
  }

  return allowed.has(value as T) ? value : value.trim().toLowerCase();
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
