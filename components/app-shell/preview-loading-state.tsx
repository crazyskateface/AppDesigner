export function PreviewLoadingState() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-[var(--color-panel)]">
      <div className="grid min-h-[34rem] lg:grid-cols-[220px_1fr]">
        <aside className="border-b border-black/6 bg-[var(--color-ink)] px-4 py-5 text-white lg:border-r lg:border-b-0">
          <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
            <div className="h-3 w-24 rounded-full bg-white/20" />
            <div className="mt-4 h-6 w-32 rounded-full bg-white/15" />
            <div className="mt-3 h-4 w-full rounded-full bg-white/10" />
          </div>
          <div className="mt-6 space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-11 rounded-2xl bg-white/8" />
            ))}
          </div>
        </aside>

        <section className="bg-[var(--color-canvas)] px-5 py-5 sm:px-7">
          <div className="rounded-[1.5rem] border border-black/8 bg-white p-5">
            <p className="text-sm font-medium text-[var(--color-ink)]">Generating preview...</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Building navigation, pages, sections, and placeholder content from the generated config.
            </p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="rounded-[1.5rem] border border-black/8 bg-white p-5">
                <div className="h-3 w-20 rounded-full bg-[var(--color-panel)]" />
                <div className="mt-4 h-5 w-32 rounded-full bg-[var(--color-panel)]" />
                <div className="mt-4 space-y-3">
                  <div className="h-3 w-4/5 rounded-full bg-[var(--color-panel)]" />
                  <div className="h-3 w-3/5 rounded-full bg-[var(--color-panel)]" />
                  <div className="h-24 rounded-[1rem] bg-[var(--color-panel)]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
