"use client";

import type { RuntimeLogEntry } from "@/lib/runtime/logs";

type RuntimeLogListProps = {
  entries: RuntimeLogEntry[];
};

export function RuntimeLogList({ entries }: RuntimeLogListProps) {
  if (!entries.length) {
    return null;
  }

  return (
    <div className="h-full overflow-hidden rounded-[1.1rem] border border-black/8 bg-[var(--color-ink)]">
      <div className="h-full space-y-2 overflow-auto px-4 py-3 font-mono text-xs text-white/80">
        {entries.map((entry) => (
          <div key={entry.id} className="grid gap-1">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-white/45">
              <span
                className={`rounded-full px-2 py-0.5 ${
                  entry.stream === "browser"
                    ? "bg-emerald-500/20 text-emerald-200"
                    : entry.stream === "stderr"
                      ? "bg-amber-500/20 text-amber-200"
                      : entry.stream === "system"
                        ? "bg-sky-500/20 text-sky-200"
                        : "bg-white/10 text-white/60"
                }`}
              >
                {entry.stream}
              </span>
              <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="break-words text-white/80">{entry.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
