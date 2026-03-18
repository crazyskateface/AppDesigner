"use client";

import type { RuntimeSession } from "@/lib/runtime/service/dto";

type RuntimeStatusCardProps = {
  session: RuntimeSession | null;
  isPending: boolean;
  canStart: boolean;
  onStart: () => void;
  onRestart: () => void;
  onStop: () => void;
};

export function RuntimeStatusCard({
  session,
  isPending,
  canStart,
  onStart,
  onRestart,
  onStop,
}: RuntimeStatusCardProps) {
  const status = session?.status ?? "stopped";
  const isActive = status === "preparing" || status === "starting" || status === "running";
  const labelTone =
    status === "running"
      ? "text-emerald-700"
      : status === "failed"
        ? "text-red-700"
        : "text-[var(--color-muted)]";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/8 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart || isPending || isActive}
          className="rounded-full bg-[var(--color-ink)] px-3.5 py-2 text-xs font-medium text-white transition hover:bg-[var(--color-ink-soft)] disabled:cursor-not-allowed disabled:bg-[var(--color-muted)]"
        >
          {isPending && !isActive ? "Starting..." : "Run app"}
        </button>
        <button
          type="button"
          onClick={onRestart}
          disabled={!canStart || isPending}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-[var(--color-ink)] transition hover:border-black/20 disabled:cursor-not-allowed disabled:text-[var(--color-muted)]"
        >
          Restart
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={!session || (!isActive && status !== "failed") || isPending}
          className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-[var(--color-ink)] transition hover:border-black/20 disabled:cursor-not-allowed disabled:text-[var(--color-muted)]"
        >
          Stop
        </button>
      </div>

      <span className={`text-[11px] font-medium tracking-[0.16em] uppercase ${labelTone}`}>
        Live preview
      </span>
    </div>
  );
}
