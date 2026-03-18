import type { DerivedStatCard } from "@/lib/preview/derive-preview-data";

type StatsSectionProps = {
  title: string;
  cards: DerivedStatCard[];
};

export function StatsSection({ title, cards }: StatsSectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-black/8 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-medium tracking-[0.14em] text-[var(--color-muted)] uppercase">
        Stats
      </p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[1.25rem] border border-black/6 bg-[var(--color-panel)] p-4">
            <p className="text-sm text-[var(--color-muted)]">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold text-[var(--color-ink)]">{card.value}</p>
            <p className="mt-2 text-xs text-[var(--color-muted)]">{card.meta}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
