import {
  orchestratorActionResultSchema,
  runtimeInspectionSnapshotSchema,
  type OrchestratorActionResult,
  type RuntimeInspectAction,
  type RuntimeInspectionSnapshot,
} from "@/lib/applications/orchestrator/actions/schema";

export function executeRuntimeInspectionAction(
  action: RuntimeInspectAction,
  snapshot?: RuntimeInspectionSnapshot | null,
): OrchestratorActionResult {
  const normalizedSnapshot = runtimeInspectionSnapshotSchema.parse(snapshot ?? {});
  const diagnostics: string[] = [];

  for (const key of action.inputs.requestedEvidence) {
    if (key === "runtime-status" && !normalizedSnapshot.status) {
      diagnostics.push("Runtime status was not available.");
    }

    if (key === "last-failure" && !normalizedSnapshot.lastFailure) {
      diagnostics.push("No runtime failure message was available.");
    }
  }

  return orchestratorActionResultSchema.parse({
    actionId: action.id,
    kind: action.kind,
    status: "completed",
    summary: "Collected structured runtime/browser inspection evidence.",
    artifacts: {
      inspection: {
        runtimeId: normalizedSnapshot.runtimeId ?? null,
        status: action.inputs.requestedEvidence.includes("runtime-status") ? normalizedSnapshot.status : null,
        lastFailure: action.inputs.requestedEvidence.includes("last-failure") ? normalizedSnapshot.lastFailure : null,
        repairAttemptSummaries: action.inputs.requestedEvidence.includes("repair-attempts")
          ? normalizedSnapshot.repairAttemptSummaries
          : [],
        recentLogs: action.inputs.requestedEvidence.includes("recent-logs")
          ? normalizedSnapshot.recentLogs.slice(0, action.safety.maxLogEntries)
          : [],
        browserRuntimeError: action.inputs.requestedEvidence.includes("browser-runtime-error")
          ? normalizedSnapshot.browserRuntimeError
          : null,
      },
    },
    diagnostics,
  });
}
