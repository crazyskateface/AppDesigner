type PlaceholderPreviewProps = {
  label: string;
  title: string;
  description: string;
};

const navItems = ["Dashboard", "Entities", "Workflow", "Settings"];
const sectionRows = [
  ["stats", "table"],
  ["list", "activity"],
  ["form", "stats"],
];

export function PlaceholderPreview({
  label,
  title,
  description,
}: PlaceholderPreviewProps) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-[var(--color-panel)]">
      <div className="grid min-h-[34rem] lg:grid-cols-[220px_1fr]">
        <aside className="border-b border-black/6 bg-[var(--color-ink)] px-4 py-5 text-white lg:border-r lg:border-b-0">
          <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
            <p className="text-xs font-medium tracking-[0.16em] text-white/55 uppercase">
              {label}
            </p>
            <h3 className="mt-3 text-xl font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/68">{description}</p>
          </div>

          <div className="mt-6 flex gap-2 overflow-auto lg:flex-col">
            {navItems.map((item, index) => (
              <div
                key={item}
                className={`rounded-2xl px-4 py-3 text-sm ${
                  index === 0 ? "bg-white text-[var(--color-ink)]" : "bg-white/6 text-white/70"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section className="flex flex-col bg-[var(--color-canvas)]">
          <header className="border-b border-black/6 px-5 py-5 sm:px-7">
            <p className="text-xs font-medium tracking-[0.16em] text-[var(--color-muted)] uppercase">
              Phase 1 placeholder
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
              Preview stays static while config generation is locked in
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
              The prompt now generates a validated intermediate app spec behind the scenes. Rendering
              from that spec comes in the next phase.
            </p>
          </header>

          <div className="grid gap-4 px-5 py-5 sm:px-7">
            {sectionRows.map((row, rowIndex) => (
              <div key={rowIndex} className="grid gap-4 md:grid-cols-2">
                {row.map((cell) => (
                  <div
                    key={`${rowIndex}-${cell}`}
                    className="rounded-[1.5rem] border border-black/8 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
                  >
                    <p className="text-xs font-medium tracking-[0.14em] text-[var(--color-muted)] uppercase">
                      Section type
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{cell}</h3>
                    <div className="mt-4 space-y-3">
                      <div className="h-3 w-4/5 rounded-full bg-[var(--color-panel)]" />
                      <div className="h-3 w-3/5 rounded-full bg-[var(--color-panel)]" />
                      <div className="h-24 rounded-[1rem] bg-[var(--color-panel)]" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
