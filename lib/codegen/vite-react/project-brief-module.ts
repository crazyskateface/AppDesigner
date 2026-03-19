import type { ProjectBrief } from "@/lib/planner/project-brief";

export function createProjectBriefModuleFile(brief: ProjectBrief): {
  path: string;
  kind: "source";
  content: string;
} {
  return {
    path: "src/project-brief.ts",
    kind: "source",
    content: `export const projectBrief = ${JSON.stringify(brief, null, 2)} as const;\n`,
  };
}
