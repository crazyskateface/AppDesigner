"use client";

import type { BuilderActivityItem } from "@/lib/builder/activity/model";

type ChatHistoryPanelProps = {
  items: BuilderActivityItem[];
};

export function ChatHistoryPanel({ items }: ChatHistoryPanelProps) {
  const visibleItems = items.filter(
    (item) =>
      item.role === "user" ||
      (item.source === "builder" &&
        item.kind !== "system-status" &&
        item.kind !== "planning"),
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] border border-black/8 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
      <div className="border-b border-black/8 px-4 py-3">
        <p className="text-sm font-medium text-[var(--color-ink)]">Conversation</p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
          User prompts and assistant replies appear here.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {visibleItems.map((item) => {
          const isAssistant = item.role === "assistant";
          const toneClass =
            item.tone === "error"
              ? "border-red-200 bg-red-50"
              : item.tone === "warning"
                ? "border-amber-200 bg-amber-50"
                : item.tone === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-black/8 bg-[var(--color-panel)]";

          return (
            <div
              key={item.id}
              className={
                isAssistant
                  ? `max-w-[92%] rounded-[1.1rem] border px-3 py-3 ${toneClass}`
                  : "ml-auto max-w-[88%] rounded-[1.1rem] bg-[var(--color-ink)] px-3 py-3 text-white"
              }
            >
              <p
                className={
                  isAssistant
                    ? "text-[11px] font-medium tracking-[0.14em] text-[var(--color-muted)] uppercase"
                    : "text-[11px] font-medium tracking-[0.14em] text-white/65 uppercase"
                }
                >
                {isAssistant ? "assistant" : item.role}
              </p>
              <p className={isAssistant ? "mt-2 text-sm leading-6 text-[var(--color-ink)]" : "mt-2 text-sm leading-6 text-white"}>{item.title}</p>
              {item.detail ? (
                <p className={isAssistant ? "mt-1 text-xs leading-5 text-[var(--color-muted)]" : "mt-1 text-xs leading-5 text-white/75"}>
                  {item.detail}
                </p>
              ) : null}
              {item.questions?.length ? (
                <div className="mt-3 space-y-2">
                  {item.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className={isAssistant ? "rounded-xl border border-black/8 bg-white/80 px-3 py-2" : "rounded-xl bg-white/10 px-3 py-2"}
                    >
                      <p className={isAssistant ? "text-xs font-medium text-[var(--color-ink)]" : "text-xs font-medium text-white"}>
                        {index + 1}. {question.label}
                      </p>
                      {question.reason ? (
                        <p className={isAssistant ? "mt-1 text-[11px] leading-5 text-[var(--color-muted)]" : "mt-1 text-[11px] leading-5 text-white/70"}>
                          {question.reason}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {item.answers?.length ? (
                <div className="mt-3 space-y-2">
                  {item.answers.map((answer) => (
                    <div
                      key={answer.questionId}
                      className={isAssistant ? "rounded-xl border border-black/8 bg-white/80 px-3 py-2" : "rounded-xl bg-white/10 px-3 py-2"}
                    >
                      <p className={isAssistant ? "text-[11px] font-medium text-[var(--color-muted)]" : "text-[11px] font-medium text-white/70"}>
                        {answer.label}
                      </p>
                      <p className={isAssistant ? "mt-1 text-xs leading-5 text-[var(--color-ink)]" : "mt-1 text-xs leading-5 text-white"}>
                        {answer.answer}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className={isAssistant ? "mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]" : "mt-2 text-[10px] uppercase tracking-[0.14em] text-white/55"}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
