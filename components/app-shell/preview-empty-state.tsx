export function PreviewEmptyState() {
  return (
    <div className="flex min-h-[34rem] items-center justify-center rounded-[1.75rem] border border-dashed border-black/12 bg-white p-8 text-center">
      <div className="max-w-md">
        <p className="text-xs font-medium tracking-[0.16em] text-[var(--color-muted)] uppercase">
          Preview ready
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
          Generate an app spec to render the app shell.
        </h3>
        <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
          Once you submit a prompt, this area will render navigation, pages, and sections directly
          from the generated app spec.
        </p>
      </div>
    </div>
  );
}
