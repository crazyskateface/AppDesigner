"use client";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const placeholderMessages: ChatMessage[] = [
  {
    id: "assistant-intro",
    role: "assistant",
    text: "Describe the app you want to build in plain English. I’ll turn it into a generated app shell you can preview and run locally.",
  },
  {
    id: "user-example",
    role: "user",
    text: "I want a founder-friendly internal tool that helps a small team track launch tasks, approvals, and content deadlines.",
  },
  {
    id: "assistant-followup",
    role: "assistant",
    text: "Once you generate a spec, this workspace will be ready to show the app structure on the right and launch the live runtime preview when needed.",
  },
];

export function ChatHistoryPanel() {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] border border-black/8 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
      <div className="border-b border-black/8 px-4 py-3">
        <p className="text-sm font-medium text-[var(--color-ink)]">Conversation</p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
          Placeholder history for the future chat-driven builder flow.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {placeholderMessages.map((message) => {
          const isAssistant = message.role === "assistant";

          return (
            <div
              key={message.id}
              className={
                isAssistant
                  ? "max-w-[92%] rounded-[1.1rem] border border-black/8 bg-[var(--color-panel)] px-3 py-3"
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
                {message.role}
              </p>
              <p className={isAssistant ? "mt-2 text-sm leading-6 text-[var(--color-ink)]" : "mt-2 text-sm leading-6 text-white"}>
                {message.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
