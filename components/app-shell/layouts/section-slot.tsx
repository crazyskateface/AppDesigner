import type { ReactNode } from "react";

import type { AppPreviewSection } from "@/lib/preview/model";

type SectionSlotProps = {
  section: AppPreviewSection;
  children: ReactNode;
};

export function SectionSlot({ section, children }: SectionSlotProps) {
  const emphasisClassName =
    section.emphasis === "hero"
      ? "lg:[&>section]:shadow-[0_24px_64px_rgba(15,23,42,0.08)]"
      : section.emphasis === "compact"
        ? "lg:[&>section]:scale-[0.995]"
        : "";

  return <div className={emphasisClassName}>{children}</div>;
}
