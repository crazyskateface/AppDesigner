import { z } from "zod";

export const builderModeValues = ["create", "edit"] as const;
export const builderModeSchema = z.enum(builderModeValues);

export const builderPromptSchema = z.string().trim().min(20, "Prompt must be at least 20 characters long.");

export const appArchetypeValues = ["crm", "booking", "creator", "inventory"] as const;
export const fieldTypeValues = ["text", "number", "date", "status"] as const;
export const sectionTypeValues = ["stats", "table", "list", "activity", "form"] as const;
export const pageTypeValues = ["dashboard", "list", "calendar", "settings"] as const;
export const pageLayoutValues = ["stack", "two-column", "dashboard"] as const;
export const sectionPlacementValues = ["main", "secondary", "full"] as const;
export const sectionEmphasisValues = ["default", "hero", "compact"] as const;
export const generationSourceValues = ["llm", "fallback"] as const;
export const generationFallbackReasonValues = ["missing_api_key", "provider_error", "parse_error", "validation_error"] as const;

export const appArchetypeSchema = z.enum(appArchetypeValues);
export const fieldTypeSchema = z.enum(fieldTypeValues);
export const sectionTypeSchema = z.enum(sectionTypeValues);
export const pageTypeSchema = z.enum(pageTypeValues);
export const pageLayoutSchema = z.enum(pageLayoutValues);
export const sectionPlacementSchema = z.enum(sectionPlacementValues);
export const sectionEmphasisSchema = z.enum(sectionEmphasisValues);
export const generationSourceSchema = z.enum(generationSourceValues);
export const generationFallbackReasonSchema = z.enum(generationFallbackReasonValues);

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
  entityId: z.preprocess((value) => (value === null ? undefined : value), z.string().min(1).optional()),
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

export const builderRequestSchema = z
  .object({
    prompt: builderPromptSchema,
    mode: builderModeSchema.default("create"),
    currentSpec: appSpecSchema.optional(),
  })
  .superRefine((request, ctx) => {
    if (request.mode === "edit" && !request.currentSpec) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Edit mode requires a current app spec.",
        path: ["currentSpec"],
      });
    }
  });

export const appSpecGenerationMetaSchema = z.object({
  source: generationSourceSchema,
  repaired: z.boolean(),
  fallbackReason: generationFallbackReasonSchema.optional(),
  provider: z
    .object({
      name: z.string().min(1),
      model: z.string().min(1).optional(),
    })
    .optional(),
});

export const generateAppSpecResponseSchema = z.object({
  appSpec: appSpecSchema,
  generationMeta: appSpecGenerationMetaSchema,
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
export type AppSpecGenerationMeta = z.infer<typeof appSpecGenerationMetaSchema>;
export type GenerateAppSpecResponse = z.infer<typeof generateAppSpecResponseSchema>;
export type BuilderMode = z.infer<typeof builderModeSchema>;
