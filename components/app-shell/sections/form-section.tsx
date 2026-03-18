import type { DerivedFormField } from "@/lib/preview/derive-preview-data";

type FormSectionProps = {
  title: string;
  fields: DerivedFormField[];
};

export function FormSection({ title, fields }: FormSectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-black/8 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-medium tracking-[0.14em] text-[var(--color-muted)] uppercase">
        Form
      </p>
      <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink)]">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label}>
            <p className="mb-2 text-xs font-medium tracking-[0.12em] text-[var(--color-muted)] uppercase">
              {field.label}
            </p>
            <div className="rounded-2xl border border-black/6 bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted)]">
              {field.placeholder}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-4 rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white"
      >
        Continue
      </button>
    </section>
  );
}
