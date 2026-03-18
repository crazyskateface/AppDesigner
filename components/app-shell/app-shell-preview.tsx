"use client";

import { useMemo } from "react";

import type { AppPreviewModel } from "@/lib/preview/model";

import { PageRenderer } from "@/components/app-shell/page-renderer";
import { PreviewEmptyState } from "@/components/app-shell/preview-empty-state";
import { PreviewErrorState } from "@/components/app-shell/preview-error-state";
import { PreviewLoadingState } from "@/components/app-shell/preview-loading-state";
import { ShellHeader } from "@/components/app-shell/shell-header";
import { ShellSidebar } from "@/components/app-shell/shell-sidebar";

type AppShellPreviewProps = {
  model: AppPreviewModel | null;
  activePageId?: string | null;
  onSelectPage?: (pageId: string) => void;
  isLoading?: boolean;
  error?: string | null;
};

export function AppShellPreview({
  model,
  activePageId: controlledPageId = null,
  onSelectPage,
  isLoading = false,
  error = null,
}: AppShellPreviewProps) {
  const activePageId =
    model && model.navigation.some((item) => item.pageId === controlledPageId)
      ? controlledPageId
      : (model?.navigation[0]?.pageId ?? null);

  const activePage = useMemo(() => {
    if (!model || !activePageId) {
      return null;
    }

    return model.pages.find((page) => page.id === activePageId) ?? null;
  }, [activePageId, model]);

  if (!model && isLoading) {
    return <PreviewLoadingState />;
  }

  if (!model && error) {
    return <PreviewErrorState message={error} />;
  }

  if (!model) {
    return <PreviewEmptyState />;
  }

  if (!activePage) {
    return (
      <PreviewErrorState message="We generated an app spec, but the preview could not render this version yet. Try another prompt." />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-black/8 bg-[var(--color-panel)]">
      {isLoading ? (
        <div className="absolute inset-0 z-10 flex items-start justify-end bg-white/45 p-4 backdrop-blur-[2px]">
          <div className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-[var(--color-muted)] shadow-sm">
            Updating preview...
          </div>
        </div>
      ) : null}

      <div className="grid min-h-[34rem] lg:grid-cols-[220px_1fr]">
        <ShellSidebar
          items={model.navigation}
          activePageId={activePageId}
          onSelect={(pageId) => onSelectPage?.(pageId)}
        />

        <section className="flex flex-col bg-[var(--color-canvas)]">
          <ShellHeader model={model} page={activePage} />
          <PageRenderer model={model} page={activePage} />
        </section>
      </div>
    </div>
  );
}
