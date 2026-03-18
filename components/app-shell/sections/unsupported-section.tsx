type UnsupportedSectionProps = {
  title: string;
  type: string;
};

export function UnsupportedSection({ title, type }: UnsupportedSectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
      <p className="text-xs font-medium tracking-[0.14em] text-amber-700 uppercase">
        Unsupported section
      </p>
      <h3 className="mt-2 text-lg font-semibold text-amber-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-amber-800">
        The renderer does not support the `{type}` section type yet, so this block is shown as a
        safe fallback.
      </p>
    </section>
  );
}
