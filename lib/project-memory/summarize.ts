import type { AppSpec } from "@/lib/domain/app-spec";
import type { RuntimeSession } from "@/lib/runtime/service/dto";

import type { ProjectBuildMemory } from "@/lib/project-memory/schema";

export function summarizeAppSpecForProjectMemory(spec: AppSpec) {
  return {
    appTitle: spec.title,
    archetype: spec.archetype,
    pageTitles: spec.pages.map((page) => page.title).slice(0, 12),
    entityNames: spec.entities.map((entity) => entity.name).slice(0, 16),
    lastSpecId: spec.appId,
    runtimeStatus: null,
    lastFailure: null,
  };
}

export function summarizeRuntimeSessionForProjectMemory(runtimeSession: RuntimeSession | null) {
  if (!runtimeSession) {
    return {
      runtimeStatus: null,
      lastFailure: null,
    };
  }

  return {
    runtimeStatus: runtimeSession.status,
    lastFailure: runtimeSession.failure?.message ?? null,
  };
}

export function buildProjectMemoryLlmSummary(memory: ProjectBuildMemory) {
  const sections: string[] = [];

  if (memory.currentDirection.summary.trim()) {
    sections.push(`Current direction: ${memory.currentDirection.summary.trim()}`);
  }

  const recentPrompt = memory.recentPrompts.at(-1);

  if (recentPrompt) {
    sections.push(`Latest prompt: ${recentPrompt.prompt}`);
  }

  const decisions = memory.decisions.slice(-4).map((decision) => `- ${decision.summary}`);

  if (decisions.length) {
    sections.push(["Key decisions:", ...decisions].join("\n"));
  }

  const constraints = memory.constraints.slice(-4).map((constraint) => `- ${constraint.text}`);

  if (constraints.length) {
    sections.push(["Active constraints:", ...constraints].join("\n"));
  }

  const clarificationDetails = memory.clarifications
    .slice(-2)
    .flatMap((batch) => batch.answers.map((answer) => `- ${answer.label}: ${answer.answer}`));

  if (clarificationDetails.length) {
    sections.push(["Confirmed clarifications:", ...clarificationDetails].join("\n"));
  }

  const { projectState } = memory;
  const projectStateLines = [
    projectState.appTitle ? `Current app: ${projectState.appTitle}` : null,
    projectState.pageTitles.length ? `Pages: ${projectState.pageTitles.join(", ")}` : null,
    projectState.runtimeStatus ? `Runtime: ${projectState.runtimeStatus}` : null,
    projectState.lastFailure ? `Last failure: ${projectState.lastFailure}` : null,
  ].filter((value): value is string => Boolean(value));

  if (projectStateLines.length) {
    sections.push(projectStateLines.join("\n"));
  }

  const outcomes = memory.recentOutcomes.slice(-3).map((outcome) => `- ${outcome.summary}`);

  if (outcomes.length) {
    sections.push(["Recent outcomes:", ...outcomes].join("\n"));
  }

  return sections.join("\n\n").trim();
}
