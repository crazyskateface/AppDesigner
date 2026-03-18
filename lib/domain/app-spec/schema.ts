import { z } from "zod";

export const builderRequestSchema = z.object({
  prompt: z.string().trim().min(20, "Prompt must be at least 20 characters long."),
});

export const appArchetypeSchema = z.enum(["crm", "booking", "creator", "inventory"]);
export const fieldTypeSchema = z.enum(["text", "number", "date", "status"]);
export const sectionTypeSchema = z.enum(["stats", "table", "list", "activity", "form"]);
export const pageTypeSchema = z.enum(["dashboard", "list", "calendar", "settings"]);
export const pageLayoutSchema = z.enum(["stack", "two-column", "dashboard"]);
export const sectionPlacementSchema = z.enum(["main", "secondary", "full"]);
export const sectionEmphasisSchema = z.enum(["default", "hero", "compact"]);

export const entityFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: fieldTypeSchema,
});

export const entitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  fields: z.array(entityFieldSchema).min(1),
});

export const navigationItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  pageId: z.string().min(1),
});

export const sectionSchema = z.object({
  id: z.string().min(1),
  type: sectionTypeSchema,
  title: z.string().min(1),
  entityId: z.string().optional(),
  placement: sectionPlacementSchema.default("main"),
  emphasis: sectionEmphasisSchema.default("default"),
});

export const pageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  pageType: pageTypeSchema,
  pageLayout: pageLayoutSchema.default("stack"),
  entityIds: z.array(z.string()).default([]),
  sections: z.array(sectionSchema).min(1).max(3),
});

export const appSpecSchema = z
  .object({
    appId: z.string().min(1),
    prompt: z.string().min(1),
    title: z.string().min(1),
    archetype: appArchetypeSchema,
    entities: z.array(entitySchema).min(1).max(4),
    navigation: z.array(navigationItemSchema).min(1),
    pages: z.array(pageSchema).min(1).max(5),
  })
  .superRefine((spec, ctx) => {
    const pageIds = new Set(spec.pages.map((page) => page.id));
    const entityIds = new Set(spec.entities.map((entity) => entity.id));

    spec.navigation.forEach((item, index) => {
      if (!pageIds.has(item.pageId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Navigation item "${item.label}" references unknown page "${item.pageId}".`,
          path: ["navigation", index, "pageId"],
        });
      }
    });

    spec.pages.forEach((page, pageIndex) => {
      page.entityIds.forEach((entityId, entityIndex) => {
        if (!entityIds.has(entityId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Page "${page.title}" references unknown entity "${entityId}".`,
            path: ["pages", pageIndex, "entityIds", entityIndex],
          });
        }
      });

      page.sections.forEach((section, sectionIndex) => {
        if (section.entityId && !entityIds.has(section.entityId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Section "${section.title}" references unknown entity "${section.entityId}".`,
            path: ["pages", pageIndex, "sections", sectionIndex, "entityId"],
          });
        }
      });
    });
  });

export type BuilderRequest = z.infer<typeof builderRequestSchema>;
export type AppArchetype = z.infer<typeof appArchetypeSchema>;
export type FieldType = z.infer<typeof fieldTypeSchema>;
export type EntityField = z.infer<typeof entityFieldSchema>;
export type EntityConfig = z.infer<typeof entitySchema>;
export type NavigationItem = z.infer<typeof navigationItemSchema>;
export type AppSpecSection = z.infer<typeof sectionSchema>;
export type AppSpecPage = z.infer<typeof pageSchema>;
export type AppSpec = z.infer<typeof appSpecSchema>;
export type PageLayout = z.infer<typeof pageLayoutSchema>;
export type PageType = z.infer<typeof pageTypeSchema>;
export type SectionPlacement = z.infer<typeof sectionPlacementSchema>;
export type SectionEmphasis = z.infer<typeof sectionEmphasisSchema>;
export type SectionType = z.infer<typeof sectionTypeSchema>;
