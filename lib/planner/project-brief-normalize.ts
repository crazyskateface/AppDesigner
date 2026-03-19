import { normalizePrompt, slugify } from "@/lib/domain/app-spec/parse";
import { projectBriefSchema, type ProjectBrief } from "@/lib/planner/project-brief";

type ProjectBriefCandidate = Partial<ProjectBrief> & {
  navigation?: Array<{ id?: string; label?: string; pageId?: string }>;
  pages?: Array<{ id?: string; title?: string; pageType?: string; summary?: string; sectionTitles?: string[] }>;
  source?: { kind?: string; referenceId?: string };
};

export function normalizeProjectBriefCandidate(candidate: unknown, prompt: string): ProjectBriefCandidate {
  const normalizedPrompt = normalizePrompt(prompt);
  const value = isRecord(candidate) ? candidate : {};
  const source = isRecord(value.source) ? value.source : {};
  const title = normalizeText(value.title) || "Generated Workspace";
  const briefId = normalizeText(value.briefId) || `brief-${slugify(title) || "generated-workspace"}`;
  const pages = normalizePages(value.pages);
  const pageIds = new Set(pages.map((page) => page.id));
  const navigation = normalizeNavigation(value.navigation, pages, pageIds);

  const normalizedCandidate: ProjectBriefCandidate = {
    briefId,
    title,
    prompt: normalizeText(value.prompt) || normalizedPrompt,
    summary: normalizeText(value.summary) || `${title} project brief for a runnable founder demo workspace.`,
    targetKind: "vite-react-static",
    navigation,
    pages,
    constraints: normalizeConstraints(value.constraints),
    source: {
      kind: "llm-plan",
      referenceId: normalizeText(source.referenceId) || briefId,
    },
  };

  return normalizedCandidate;
}

export function validateProjectBriefCandidate(candidate: unknown) {
  return projectBriefSchema.safeParse(candidate);
}

function normalizePages(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      {
        id: "overview",
        title: "Overview",
        pageType: "dashboard",
        summary: "Primary overview page for the generated workspace.",
        sectionTitles: ["Key metrics", "Recent activity"],
      },
    ];
  }

  return value.slice(0, 6).map((page, index) => {
    const record = isRecord(page) ? page : {};
    const title = normalizeText(record.title) || `Page ${index + 1}`;
    const requestedId = slugify(normalizeText(record.id));

    return {
      id: requestedId || slugify(title) || `page-${index + 1}`,
      title,
      pageType: normalizeText(record.pageType) || "dashboard",
      summary: normalizeText(record.summary) || `${title} workspace page.`,
      sectionTitles: normalizeSectionTitles(record.sectionTitles),
    };
  });
}

function normalizeNavigation(value: unknown, pages: ReturnType<typeof normalizePages>, pageIds: Set<string>) {
  if (!Array.isArray(value) || value.length === 0) {
    return pages.map((page) => ({
      id: `${page.id}-nav`,
      label: page.title,
      pageId: page.id,
    }));
  }

  const items = value.slice(0, 6).map((item, index) => {
    const record = isRecord(item) ? item : {};
    const pageId = slugify(normalizeText(record.pageId));
    const matchedPage = pageId && pageIds.has(pageId) ? pages.find((page) => page.id === pageId) : pages[index] ?? pages[0];
    const label = normalizeText(record.label) || matchedPage?.title || `Page ${index + 1}`;
    const requestedId = slugify(normalizeText(record.id));

    return {
      id: requestedId || `${slugify(label) || `page-${index + 1}`}-nav`,
      label,
      pageId: matchedPage?.id || pages[0]?.id || "overview",
    };
  });

  return items.length > 0 ? items : pages.map((page) => ({ id: `${page.id}-nav`, label: page.title, pageId: page.id }));
}

function normalizeSectionTitles(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return ["Overview"];
  }

  return value
    .map((item) => normalizeText(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, 6);
}

function normalizeConstraints(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      "Generate a runnable Vite + React workspace.",
      "Favor a polished founder-demo workflow over feature breadth.",
      "Keep the output implementation-friendly for later code-generation stages.",
    ];
  }

  return value
    .map((item) => normalizeText(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, 8);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
