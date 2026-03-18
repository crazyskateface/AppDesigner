import type { AppPreviewModel, AppPreviewPage, AppPreviewSection } from "@/lib/preview/model";

import { SectionRenderer } from "@/components/app-shell/section-renderer";
import { SectionSlot } from "@/components/app-shell/layouts/section-slot";

type TwoColumnPageLayoutProps = {
  model: AppPreviewModel;
  page: AppPreviewPage;
};

export function TwoColumnPageLayout({ model, page }: TwoColumnPageLayoutProps) {
  const fullSections = page.sections.filter((section) => section.placement === "full");
  const mainSections = page.sections.filter((section) => getPlacement(section) === "main");
  const secondarySections = page.sections.filter((section) => getPlacement(section) === "secondary");

  return (
    <div className="space-y-4">
      {fullSections.length > 0 ? (
        <div className="grid gap-4">
          {fullSections.map((section) => (
            <SectionSlot key={section.id} section={section}>
              <SectionRenderer model={model} page={page} section={section} />
            </SectionSlot>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.95fr)]">
        <div className="grid gap-4">
          {mainSections.map((section) => (
            <SectionSlot key={section.id} section={section}>
              <SectionRenderer model={model} page={page} section={section} />
            </SectionSlot>
          ))}
        </div>

        {secondarySections.length > 0 ? (
          <aside className="grid content-start gap-4">
            {secondarySections.map((section) => (
              <SectionSlot key={section.id} section={section}>
                <SectionRenderer model={model} page={page} section={section} />
              </SectionSlot>
            ))}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function getPlacement(section: AppPreviewSection) {
  return section.placement === "secondary" ? "secondary" : "main";
}
