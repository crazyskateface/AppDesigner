import type { DerivedActivityItem } from "@/lib/preview/derive-preview-data";

type ActivitySectionProps = {
  title: string;
  items: DerivedActivityItem[];
};

export function ActivitySection({ title, items }: ActivitySectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-black/8 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-medium tracking-[0.14em] text-[var(--color-muted)] uppercase">
        Activity
      </p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={`${item.title}-${item.detail}`} className="rounded-[1.25rem] border border-black/6 bg-[var(--color-panel)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
