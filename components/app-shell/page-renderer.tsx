import type { AppPreviewModel, AppPreviewPage } from "@/lib/preview/model";

import { PageLayoutRenderer } from "@/components/app-shell/layouts/page-layout-renderer";

type PageRendererProps = {
  model: AppPreviewModel;
  page: AppPreviewPage;
};

export function PageRenderer({ model, page }: PageRendererProps) {
  return (
    <div className="px-5 py-5 sm:px-7">
      <PageLayoutRenderer model={model} page={page} />
    </div>
  );
}
