"use client";

import { useState } from "react";

import { RuntimeLogList } from "@/components/builder/runtime-log-list";
import type { RuntimeLogEntry } from "@/lib/runtime/logs";
import type { RuntimeSession } from "@/lib/runtime/service/dto";

type WorkspaceTerminalProps = {
  entries: RuntimeLogEntry[];
  runtimeSession: RuntimeSession | null;
  runtimeError: string | null;
};

export function WorkspaceTerminal({ entries, runtimeSession, runtimeError }: WorkspaceTerminalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusLabel = runtimeSession?.status ?? "idle";
  const shouldShowBadge = entries.length > 0 || Boolean(runtimeError);
  const browserCount = entries.filter((entry) => entry.stream === "browser").length;
  const runnerCount = entries.filter((entry) => entry.stream === "stdout" || entry.stream === "stderr").length;

  const summaryLabel = browserCount
    ? `${runnerCount} runner / ${browserCount} browser`
    : runnerCount
      ? `${runnerCount} runner`
      : entries.length
        ? `${entries.length} events`
        : "Read-only";

  return (
    <section
      className={`overflow-hidden rounded-[1.35rem] border border-black/8 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)] transition-[height] duration-200 ${
        isExpanded ? "h-[min(30vh,18rem)]" : "h-12"
      }`}
    >
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-ink)]">Terminal</p>
            <p className="text-[11px] leading-5 text-[var(--color-muted)]">Raw runner and browser events. Read-only for now.</p>
          </div>
          <span className="text-[11px] font-medium tracking-[0.14em] text-[var(--color-muted)] uppercase">
            {statusLabel}
          </span>
          {shouldShowBadge ? (
            <span className="rounded-full bg-[var(--color-panel)] px-2 py-1 text-[10px] font-medium tracking-[0.08em] text-[var(--color-muted)] uppercase">
              {summaryLabel}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-[var(--color-ink)] uppercase transition hover:border-black/20"
        >
          {isExpanded ? "Hide logs" : "Show logs"}
        </button>
      </div>

      <div className="h-[calc(100%-3rem)] border-t border-black/8 p-3">
        {entries.length ? (
          <RuntimeLogList entries={entries} />
        ) : (
          <div className="flex h-full min-h-[12rem] flex-col justify-center rounded-[1.25rem] border border-dashed border-black/10 bg-[var(--color-panel)] px-5 py-4">
            <p className="text-sm font-medium text-[var(--color-ink)]">
              {runtimeError ? "Runtime output unavailable" : "Runtime logs will appear here"}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              {runtimeError
                ? runtimeError
                : "Start the live preview to stream build, runtime, browser, and repair output into this terminal area."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
