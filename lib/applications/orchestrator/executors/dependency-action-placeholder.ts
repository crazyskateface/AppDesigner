import {
  orchestratorActionResultSchema,
  type DependencyChangeSetAction,
  type OrchestratorActionResult,
} from "@/lib/applications/orchestrator/actions/schema";

export function executeDependencyActionPlaceholder(action: DependencyChangeSetAction): OrchestratorActionResult {
  return orchestratorActionResultSchema.parse({
    actionId: action.id,
    kind: action.kind,
    status: "planned-only",
    summary: "Dependency/package changes are planned in the action model but are not executable in this phase.",
    diagnostics: action.inputs.packages.map((pkg) => `Planned dependency change: ${pkg.change} ${pkg.name}`),
  });
}
