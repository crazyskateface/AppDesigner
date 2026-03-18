import type { AppPreviewModel, AppPreviewPage } from "@/lib/preview/model";

type ShellHeaderProps = {
  model: AppPreviewModel;
  page: AppPreviewPage;
};

export function ShellHeader({ model, page }: ShellHeaderProps) {
  const linkedEntities = page.entityIds
    .map((entityId) => model.entities.find((entity) => entity.id === entityId)?.name)
    .filter((value): value is string => Boolean(value));

  return (
    <header className="border-b border-black/6 px-5 py-5 sm:px-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-[var(--color-muted)] uppercase">
            {model.archetype}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
            {page.title}
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
            {model.title}
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-black/8 bg-white px-4 py-3 text-sm text-[var(--color-muted)]">
          <p className="font-medium text-[var(--color-ink)] capitalize">{page.pageLayout}</p>
          <p className="mt-1 capitalize">{page.pageType} page</p>
          {linkedEntities.length > 0 ? (
            <p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">
              Focused on {linkedEntities.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
