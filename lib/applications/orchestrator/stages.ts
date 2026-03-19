export const orchestratorStageValues = ["intake", "clarify", "plan", "generate", "materialize", "run", "inspect", "fix"] as const;
export const orchestratorStageStatusValues = ["completed", "failed", "pending"] as const;

export type OrchestratorStage = (typeof orchestratorStageValues)[number];
export type OrchestratorStageStatus = (typeof orchestratorStageStatusValues)[number];

export type OrchestratorStageEvent = {
  stage: OrchestratorStage;
  status: OrchestratorStageStatus;
  provider?: {
    name: string;
    model?: string;
  };
  detail?: string;
};

export function createCompletedStage(
  stage: OrchestratorStage,
  detail?: string,
  provider?: OrchestratorStageEvent["provider"],
): OrchestratorStageEvent {
  return {
    stage,
    status: "completed",
    detail,
    provider,
  };
}
