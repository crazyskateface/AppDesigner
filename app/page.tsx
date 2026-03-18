import Link from "next/link";

import { AppShellPreview } from "@/components/preview/app-shell/app-shell-preview";
import { RecentProjectsList } from "@/components/recent-projects/recent-projects-list";
import { generateAppSpec, promptExamples, supportedAppTypes } from "@/lib/domain/app-spec";
import { appSpecToPreviewModel } from "@/lib/preview/adapters/spec-to-preview";

const principles = [
  {
    title: "Describe the product in plain English",
    body: "Start with a simple prompt about the audience, workflow, and outcome you want the app to support.",
  },
  {
    title: "Get a structured app spec back",
    body: "The system maps your prompt into a lean internal spec with archetype, entities, pages, navigation, and section structure.",
  },
  {
    title: "Lock in the contract before rendering",
    body: "Phase 1 focuses on the generation layer first so the later preview system has a stable source of truth.",
  },
];

const highlights = [
  "Local-first prototype with no auth and no deployment setup needed",
  "Config-driven generation instead of brittle full-stack codegen",
  "Polished, minimal UI intended for fast founder demos",
];

const sampleSpec = generateAppSpec(promptExamples[0]);
const samplePreviewModel = appSpecToPreviewModel(sampleSpec);

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border border-black/8 bg-white/78 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-[var(--color-ink)] uppercase">
            AppDesigner
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[var(--color-muted)] sm:inline">
              Prototype for founders, creators, and operators
            </span>
            <Link
              href="/builder"
              className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-ink-soft)]"
            >
              Try the prototype
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-14 py-12 lg:grid-cols-[1.04fr_0.96fr] lg:py-16">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium tracking-[0.16em] text-[var(--color-muted)] uppercase">
              AI app building without the mess
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-balance text-[var(--color-ink)] sm:text-6xl">
              Turn your app idea into a believable prototype in minutes.
            </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">
                Describe the product you want to build and generate a validated app spec that now
                drives a believable shell preview with pages, navigation, and reusable sections.
              </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/builder"
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-ink-soft)]"
              >
                Try the prototype
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-[var(--color-ink)] transition hover:border-black/20"
              >
                See how it works
              </a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item} className="rounded-3xl border border-black/8 bg-white p-4 text-sm leading-6 text-[var(--color-muted)] shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/8 bg-white p-3 shadow-[0_36px_120px_rgba(15,23,42,0.12)]">
            <div className="mb-3 rounded-[1.5rem] border border-black/6 bg-[var(--color-panel)] px-4 py-3">
              <p className="text-sm font-medium text-[var(--color-ink)]">Generated prototype example</p>
             <p className="mt-1 text-sm text-[var(--color-muted)]">
                A sample CRM shell rendered from the same intermediate app spec system used in the builder.
              </p>
            </div>
            <AppShellPreview model={samplePreviewModel} />
          </div>
        </section>

        <section
          id="how-it-works"
          className="grid gap-4 border-t border-black/6 py-14 md:grid-cols-3"
        >
          {principles.map((item, index) => (
            <div key={item.title} className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
              <span className="text-sm font-medium text-[var(--color-muted)]">0{index + 1}</span>
              <h2 className="mt-4 text-xl font-semibold text-[var(--color-ink)]">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{item.body}</p>
            </div>
          ))}
        </section>

        <RecentProjectsList />

        <section className="grid gap-6 border-t border-black/6 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-medium tracking-[0.16em] text-[var(--color-muted)] uppercase">
              Supported first-pass shells
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
              Focused archetypes beat broad promises in v1.
            </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-[var(--color-muted)]">
               This prototype intentionally constrains prompts into a narrow contract so LLM-generated
               app specs stay believable, valid, and implementation-friendly.
              </p>
            </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {supportedAppTypes.map((type) => (
              <div key={type.title} className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
                <h3 className="text-lg font-semibold text-[var(--color-ink)]">{type.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{type.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 border-t border-black/6 py-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-black/8 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
            <p className="text-sm font-medium tracking-[0.16em] text-[var(--color-muted)] uppercase">
              Honest framing
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
              This prototype generates structured app specs, not production software.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-muted)]">
              The point is not to automate the whole build in one shot. The point is to define a
              clean contract between prompt input and future rendering so the next phase has a stable
              foundation.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-[2rem] border border-black/8 bg-[var(--color-panel)] p-8">
            <div>
              <p className="text-sm font-medium tracking-[0.16em] text-[var(--color-muted)] uppercase">
                Good for
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-muted)]">
                <li>Founder demos and early product thinking</li>
                <li>Clarifying product structure before design or engineering</li>
                <li>Turning a fuzzy idea into something discussable</li>
              </ul>
            </div>
            <Link
              href="/builder"
              className="mt-8 inline-flex w-fit items-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-[var(--color-ink)] transition hover:border-black/20"
            >
              Open the builder
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
