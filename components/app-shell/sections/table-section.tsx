import type { DerivedTableData } from "@/lib/preview/derive-preview-data";

type TableSectionProps = {
  title: string;
  data: DerivedTableData;
};

export function TableSection({ title, data }: TableSectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-black/8 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-medium tracking-[0.14em] text-[var(--color-muted)] uppercase">
        Table
      </p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
      <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-black/6">
        <div
          className="grid bg-[var(--color-panel)] text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]"
          style={{ gridTemplateColumns: `repeat(${data.columns.length}, minmax(0, 1fr))` }}
        >
          {data.columns.map((column) => (
            <div key={column} className="px-4 py-3">
              {column}
            </div>
          ))}
        </div>
        <div className="divide-y divide-black/6 bg-white">
          {data.rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid text-sm text-[var(--color-muted)]"
              style={{ gridTemplateColumns: `repeat(${data.columns.length}, minmax(0, 1fr))` }}
            >
              {row.map((value, cellIndex) => (
                <div key={`${rowIndex}-${cellIndex}`} className="px-4 py-3">
                  {value}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
