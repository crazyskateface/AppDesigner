import type { AppPreviewModel, AppPreviewPage, AppPreviewSection } from "@/lib/preview/model";

import { SectionRenderer } from "@/components/app-shell/section-renderer";
import { SectionSlot } from "@/components/app-shell/layouts/section-slot";

type DashboardPageLayoutProps = {
  model: AppPreviewModel;
  page: AppPreviewPage;
};

export function DashboardPageLayout({ model, page }: DashboardPageLayoutProps) {
  const heroSections = page.sections.filter(
    (section) => section.emphasis === "hero" || section.placement === "full",
  );
  const mainSections = page.sections.filter((section) => isBodyMain(section));
  const secondarySections = page.sections.filter((section) => section.placement === "secondary");

  return (
    <div className="space-y-4">
      {heroSections.length > 0 ? (
        <div className="grid gap-4">
          {heroSections.map((section) => (
            <SectionSlot key={section.id} section={section}>
              <SectionRenderer model={model} page={page} section={section} />
            </SectionSlot>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.9fr)]">
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

function isBodyMain(section: AppPreviewSection) {
  return section.placement !== "secondary" && section.emphasis !== "hero" && section.placement !== "full";
}
