import type {
  AppPreviewEntity as EntityConfig,
  AppPreviewField as EntityField,
  AppPreviewModel,
  AppPreviewPage,
  AppPreviewSection,
} from "@/lib/preview/model";
import { fakeFieldValue, fakeFormPlaceholder, fakeStatValue } from "@/lib/app-preview/fake-values";

export type DerivedStatCard = {
  label: string;
  value: string;
  meta: string;
};

export type DerivedTableData = {
  columns: string[];
  rows: string[][];
};

export type DerivedListItem = {
  title: string;
  meta: string[];
};

export type DerivedActivityItem = {
  title: string;
  detail: string;
};

export type DerivedFormField = {
  label: string;
  placeholder: string;
  type: EntityField["type"];
};

export function resolveSectionEntity(
  model: AppPreviewModel,
  page: AppPreviewPage,
  section: AppPreviewSection,
): EntityConfig | null {
  if (section.entityId) {
    return model.entities.find((entity) => entity.id === section.entityId) ?? null;
  }

  if (page.entityIds.length > 0) {
    return model.entities.find((entity) => entity.id === page.entityIds[0]) ?? null;
  }

  return model.entities.length === 1 ? model.entities[0] : null;
}

export function deriveStatsCards(
  model: AppPreviewModel,
  page: AppPreviewPage,
  section: AppPreviewSection,
): DerivedStatCard[] {
  const entity = resolveSectionEntity(model, page, section);
  const entityName = entity?.name ?? "Item";
  const sourceFields = entity?.fields.slice(0, 3) ?? [];
  const baseCards = sourceFields.map((field, index) => ({
    label: index === 0 ? `Total ${pluralize(entityName)}` : `${entityName} ${field.label}`,
    value: fakeStatValue(field, index),
    meta: `Derived from ${field.label.toLowerCase()}`,
  }));

  while (baseCards.length < 3) {
    const fallbackIndex = baseCards.length;
    baseCards.push({
      label: fallbackIndex === 0 ? `Total ${pluralize(entityName)}` : `${section.title} signal ${fallbackIndex}`,
      value: String((fallbackIndex + 1) * 14),
      meta: `Previewed from ${section.title.toLowerCase()}`,
    });
  }

  return baseCards;
}

export function deriveTableData(
  model: AppPreviewModel,
  page: AppPreviewPage,
  section: AppPreviewSection,
): DerivedTableData {
  const entity = resolveSectionEntity(model, page, section);
  const fallbackTitle = entity?.name ?? section.title;
  const fields = entity?.fields.slice(0, 4) ?? fallbackFields(fallbackTitle);

  return {
    columns: fields.map((field) => field.label),
    rows: Array.from({ length: 4 }, (_, rowIndex) =>
      fields.map((field) => fakeFieldValue(field, entity ?? fallbackEntity(fallbackTitle), rowIndex)),
    ),
  };
}

export function deriveListItems(
  model: AppPreviewModel,
  page: AppPreviewPage,
  section: AppPreviewSection,
): DerivedListItem[] {
  const entity = resolveSectionEntity(model, page, section) ?? fallbackEntity(section.title);
  const titleField = entity.fields.find((field) => field.type === "text") ?? entity.fields[0];
  const metaFields = entity.fields.filter((field) => field.key !== titleField.key).slice(0, 2);

  return Array.from({ length: 4 }, (_, index) => ({
    title: fakeFieldValue(titleField, entity, index),
    meta: metaFields.map((field) => `${field.label}: ${fakeFieldValue(field, entity, index)}`),
  }));
}

export function deriveActivityItems(
  model: AppPreviewModel,
  page: AppPreviewPage,
  section: AppPreviewSection,
): DerivedActivityItem[] {
  const entity = resolveSectionEntity(model, page, section) ?? fallbackEntity(section.title);
  const primaryField = entity.fields[0];
  const detailField = entity.fields[1] ?? entity.fields[0];

  return Array.from({ length: 4 }, (_, index) => ({
    title: `${entity.name} ${index + 1} updated`,
    detail: `${primaryField.label}: ${fakeFieldValue(primaryField, entity, index)} • ${detailField.label}: ${fakeFieldValue(detailField, entity, index)}`,
  }));
}

export function deriveFormFields(
  model: AppPreviewModel,
  page: AppPreviewPage,
  section: AppPreviewSection,
): DerivedFormField[] {
  const entity = resolveSectionEntity(model, page, section) ?? fallbackEntity(section.title);
  return entity.fields.slice(0, 4).map((field, index) => ({
    label: field.label,
    placeholder: fakeFormPlaceholder(field, entity, index),
    type: field.type,
  }));
}

function pluralize(value: string) {
  return value.endsWith("y") ? `${value.slice(0, -1)}ies` : `${value}s`;
}

function fallbackFields(title: string): EntityField[] {
  return [
    { key: "name", label: `${title} name`, type: "text" },
    { key: "status", label: "Status", type: "status" },
    { key: "date", label: "Date", type: "date" },
  ];
}

function fallbackEntity(title: string): EntityConfig {
  return {
    id: "fallback",
    name: title,
    fields: fallbackFields(title),
  };
}
