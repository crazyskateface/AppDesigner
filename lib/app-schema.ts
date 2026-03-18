export {
  appSpecSchema,
  appArchetypeSchema,
  builderRequestSchema,
  entityFieldSchema,
  entitySchema,
  navigationItemSchema,
  pageLayoutSchema,
  pageSchema,
  pageTypeSchema,
  sectionEmphasisSchema,
  sectionPlacementSchema,
  sectionSchema,
  sectionTypeSchema,
} from "@/lib/domain/app-spec/schema";

export type {
  AppArchetype,
  AppSpec,
  AppSpecPage,
  AppSpecSection,
  BuilderRequest,
  EntityConfig,
  EntityField,
  NavigationItem,
  PageLayout,
  SectionEmphasis,
  SectionPlacement,
} from "@/lib/domain/app-spec/schema";

export type AppConfig = import("@/lib/domain/app-spec/schema").AppSpec;
export type PageConfig = import("@/lib/domain/app-spec/schema").AppSpecPage;
export type SectionConfig = import("@/lib/domain/app-spec/schema").AppSpecSection;
