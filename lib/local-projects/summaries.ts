import type { PersistedProject, RecentProjectSummary } from "@/lib/persistence/local-projects/schema";

const promptPreviewLimit = 96;

export function deriveRecentProjectSummary(project: PersistedProject): RecentProjectSummary {
  const generatedTitle = project.generatedSpec?.title ?? "Untitled project";
  const title = project.manualTitleOverride ?? generatedTitle;
  const promptPreview = truncate(project.prompt.trim() || "Untitled draft", promptPreviewLimit);

  return {
    projectId: project.projectId,
    title,
    archetype: project.generatedSpec?.archetype ?? null,
    promptPreview,
    updatedAt: project.updatedAt,
  };
}

export function formatUpdatedAt(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Updated recently";
  }

  return `Updated ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed)}`;
}

function truncate(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit - 1).trimEnd()}…`;
}
