import type { AppPreviewNavigationItem } from "@/lib/preview/model";

type ShellSidebarProps = {
  items: AppPreviewNavigationItem[];
  activePageId: string | null;
  onSelect: (pageId: string) => void;
};

export function ShellSidebar({ items, activePageId, onSelect }: ShellSidebarProps) {
  return (
    <aside className="border-b border-black/6 bg-[var(--color-ink)] px-4 py-5 text-white lg:border-r lg:border-b-0">
      <div className="rounded-[1.25rem] border border-white/10 bg-white/6 p-4">
        <p className="text-xs font-medium tracking-[0.16em] text-white/55 uppercase">Workspace</p>
        <p className="mt-3 text-sm leading-6 text-white/68">
          Navigate the generated product shell and inspect how each page is composed.
        </p>
      </div>

      <nav className="mt-6 flex gap-2 overflow-auto lg:flex-col">
        {items.map((item) => {
          const isActive = item.pageId === activePageId;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.pageId)}
              className={`rounded-2xl px-4 py-3 text-left text-sm transition ${
                isActive
                  ? "bg-white text-[var(--color-ink)]"
                  : "bg-white/6 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
