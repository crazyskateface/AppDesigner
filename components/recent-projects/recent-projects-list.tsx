"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { RecentProjectSummary } from "@/lib/persistence/local-projects/schema";
import { listRecentProjectSummaries } from "@/lib/persistence/local-projects/storage";
import { formatUpdatedAt } from "@/lib/persistence/local-projects/summaries";

export function RecentProjectsList() {
  const [projects, setProjects] = useState<RecentProjectSummary[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProjects(listRecentProjectSummaries());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-black/6 py-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium tracking-[0.16em] text-[var(--color-muted)] uppercase">
            Recent projects
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
            Pick up where you left off.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
            Local-only project snapshots from this browser. No accounts, sync, or workspace setup.
          </p>
        </div>

        <Link
          href="/builder"
          className="hidden rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:border-black/20 sm:inline-flex"
        >
          Start a new project
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <Link
            key={project.projectId}
            href={`/builder?project=${project.projectId}`}
            className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition hover:border-black/14"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">{project.title}</h3>
              <span className="rounded-full border border-black/8 bg-[var(--color-panel)] px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-[var(--color-muted)] uppercase">
                {project.archetype ?? "draft"}
              </span>
            </div>

            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{project.promptPreview}</p>

            <div className="mt-5 flex items-center justify-between text-sm text-[var(--color-muted)]">
              <span>{formatUpdatedAt(project.updatedAt)}</span>
              <span className="font-medium text-[var(--color-ink)]">Open project</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
