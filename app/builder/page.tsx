import { Suspense } from "react";

import { BuilderExperience } from "@/components/builder/builder-experience";

export default function BuilderPage() {
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] px-6 py-6 text-[var(--color-ink)] sm:px-8 lg:px-10">
      <Suspense fallback={null}>
        <BuilderExperience />
      </Suspense>
    </main>
  );
}
