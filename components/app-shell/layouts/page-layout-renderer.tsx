import type { AppPreviewModel, AppPreviewPage } from "@/lib/preview/model";

import { DashboardPageLayout } from "@/components/app-shell/layouts/dashboard-page-layout";
import { StackPageLayout } from "@/components/app-shell/layouts/stack-page-layout";
import { TwoColumnPageLayout } from "@/components/app-shell/layouts/two-column-page-layout";

type PageLayoutRendererProps = {
  model: AppPreviewModel;
  page: AppPreviewPage;
};

export function PageLayoutRenderer({ model, page }: PageLayoutRendererProps) {
  switch (page.pageLayout) {
    case "two-column":
      return <TwoColumnPageLayout model={model} page={page} />;
    case "dashboard":
      return <DashboardPageLayout model={model} page={page} />;
    case "stack":
    default:
      return <StackPageLayout model={model} page={page} />;
  }
}
