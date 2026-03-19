import type { AppSpec } from "@/lib/domain/app-spec";
import type { ProjectBrief } from "@/lib/planner/project-brief";

export function createProjectBriefFromAppSpec(spec: AppSpec): ProjectBrief {
  return {
    briefId: `brief-${spec.appId}`,
    title: spec.title,
    prompt: spec.prompt,
    summary: `${spec.archetype.toUpperCase()} workspace for ${spec.title}, organized into ${spec.pages.length} pages.`,
    targetKind: "vite-react-static",
    navigation: spec.navigation.map((item) => ({
      id: item.id,
      label: item.label,
      pageId: item.pageId,
    })),
    pages: spec.pages.map((page) => ({
      id: page.id,
      title: page.title,
      pageType: page.pageType,
      summary:
        page.sections.length > 0
          ? `${page.sections.length} sections focused on ${page.sections.map((section) => section.title).join(", ")}.`
          : "Single-page workspace view.",
      sectionTitles: page.sections.map((section) => section.title),
    })),
    constraints: [
      "Generate a runnable Vite + React workspace.",
      "Keep the structure founder-demo friendly and believable.",
      "Favor a single polished workflow over feature breadth.",
    ],
    source: {
      kind: "app-spec-adapter",
      referenceId: spec.appId,
    },
  };
}
