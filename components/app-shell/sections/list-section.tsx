import type { DerivedListItem } from "@/lib/preview/derive-preview-data";

type ListSectionProps = {
  title: string;
  items: DerivedListItem[];
};

export function ListSection({ title, items }: ListSectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-black/8 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-medium tracking-[0.14em] text-[var(--color-muted)] uppercase">
        List
      </p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-[1.25rem] border border-black/6 bg-[var(--color-panel)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
              {item.meta.map((meta) => (
                <span key={meta}>{meta}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
