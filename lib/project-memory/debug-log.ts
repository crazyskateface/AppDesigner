import type { ProjectBuildMemory, ProjectMemoryChange } from "@/lib/project-memory/schema";

export function logProjectMemoryMutation(projectId: string, changes: ProjectMemoryChange[], memory: ProjectBuildMemory) {
  if (process.env.NODE_ENV === "production" || !changes.length) {
    return;
  }

  console.log(
    "[AppDesigner][project-memory]",
    JSON.stringify(
      {
        projectId,
        updatedAt: memory.updatedAt,
        changes,
        currentDirection: memory.currentDirection,
        llmContextSummary: memory.llmContextSummary,
      },
      null,
      2,
    ),
  );
}
