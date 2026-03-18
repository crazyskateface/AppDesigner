import type { AppPreviewModel, AppPreviewPage, AppPreviewSection } from "@/lib/preview/model";
import {
  deriveActivityItems,
  deriveFormFields,
  deriveListItems,
  deriveStatsCards,
  deriveTableData,
} from "@/lib/preview/derive-preview-data";

import { ActivitySection } from "@/components/app-shell/sections/activity-section";
import { FormSection } from "@/components/app-shell/sections/form-section";
import { ListSection } from "@/components/app-shell/sections/list-section";
import { StatsSection } from "@/components/app-shell/sections/stats-section";
import { TableSection } from "@/components/app-shell/sections/table-section";
import { UnsupportedSection } from "@/components/app-shell/sections/unsupported-section";

type SectionRendererProps = {
  model: AppPreviewModel;
  page: AppPreviewPage;
  section: AppPreviewSection;
};

type Renderer = (props: SectionRendererProps) => React.ReactNode;

const sectionRenderers: Partial<Record<AppPreviewSection["type"], Renderer>> = {
  stats: ({ model, page, section }) => (
    <StatsSection title={section.title} cards={deriveStatsCards(model, page, section)} />
  ),
  table: ({ model, page, section }) => (
    <TableSection title={section.title} data={deriveTableData(model, page, section)} />
  ),
  list: ({ model, page, section }) => (
    <ListSection title={section.title} items={deriveListItems(model, page, section)} />
  ),
  activity: ({ model, page, section }) => (
    <ActivitySection title={section.title} items={deriveActivityItems(model, page, section)} />
  ),
  form: ({ model, page, section }) => (
    <FormSection title={section.title} fields={deriveFormFields(model, page, section)} />
  ),
};

export function SectionRenderer(props: SectionRendererProps) {
  const renderer = sectionRenderers[props.section.type];

  if (!renderer) {
    return <UnsupportedSection title={props.section.title} type={props.section.type} />;
  }

  return renderer(props);
}
