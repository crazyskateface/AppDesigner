import type { ProjectBrief } from "@/lib/planner/project-brief";

export function createAppMetaModuleFile(brief: ProjectBrief): {
  path: string;
  kind: "source";
  content: string;
} {
  const meta = {
    name: brief.title,
    tagline: brief.summary,
    createdFrom: brief.prompt,
  };

  return {
    path: "src/app-meta.ts",
    kind: "source",
    content: `export const appMeta = ${JSON.stringify(meta, null, 2)} as const;\n`,
  };
}
