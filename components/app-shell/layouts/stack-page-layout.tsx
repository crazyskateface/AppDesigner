import type { AppPreviewModel, AppPreviewPage } from "@/lib/preview/model";

import { SectionRenderer } from "@/components/app-shell/section-renderer";
import { SectionSlot } from "@/components/app-shell/layouts/section-slot";

type StackPageLayoutProps = {
  model: AppPreviewModel;
  page: AppPreviewPage;
};

export function StackPageLayout({ model, page }: StackPageLayoutProps) {
  return (
    <div className="grid gap-4">
      {page.sections.map((section) => (
        <SectionSlot key={section.id} section={section}>
          <SectionRenderer model={model} page={page} section={section} />
        </SectionSlot>
      ))}
    </div>
  );
}
