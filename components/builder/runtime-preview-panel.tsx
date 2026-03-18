"use client";

import type { ReactNode } from "react";

import { LivePreviewFrame } from "@/components/builder/live-preview-frame";
import { RuntimeStatusCard } from "@/components/builder/runtime-status-card";
import type { RuntimeSession } from "@/lib/runtime/service/dto";

type RuntimePreviewPanelProps = {
  session: RuntimeSession | null;
  error: string | null;
  isPending: boolean;
  canStart: boolean;
  onStart: () => void;
  onRestart: () => void;
  onStop: () => void;
  schemaPreview: ReactNode;
};

export function RuntimePreviewPanel({
  session,
  error,
  isPending,
  canStart,
  onStart,
  onRestart,
  onStop,
  schemaPreview,
}: RuntimePreviewPanelProps) {
  const isRunning = session?.status === "running" && Boolean(session.previewUrl);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-black/8 bg-[var(--color-panel)] shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
      <RuntimeStatusCard
        session={session}
        isPending={isPending}
        canStart={canStart}
        onStart={onStart}
        onRestart={onRestart}
        onStop={onStop}
      />

      <div className="min-h-0 flex-1 p-2">
        {isRunning && session?.previewUrl ? <LivePreviewFrame previewUrl={session.previewUrl} /> : schemaPreview}
      </div>

      {error ? (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
