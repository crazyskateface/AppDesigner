import type { RuntimeUpdateStrategy } from "@/lib/runtime/service/dto";

import {
  orchestratorActionResultSchema,
  type OrchestratorActionResult,
} from "@/lib/applications/orchestrator/actions/schema";

export async function executeDevServerControlAction(
  action: {
    id: string;
    kind: "dev-server.control";
    executionPolicy: "execute" | "planned-only";
    safety: { allowDirectExecution: boolean };
    inputs: { requestedStrategy: RuntimeUpdateStrategy };
  },
  options: {
    runtimeId?: string | null;
    controlDevServer?: (runtimeId: string, requestedStrategy: RuntimeUpdateStrategy) => Promise<{
      strategyUsed: RuntimeUpdateStrategy;
      summary: string;
    }>;
  } = {},
): Promise<OrchestratorActionResult> {
  if (action.executionPolicy === "planned-only" || !action.safety.allowDirectExecution) {
    return orchestratorActionResultSchema.parse({
      actionId: action.id,
      kind: action.kind,
      status: "planned-only",
      summary: "Dev-server control remains planned-only for this action.",
      diagnostics: [`Requested strategy: ${action.inputs.requestedStrategy}`],
    });
  }

  if (!options.runtimeId || !options.controlDevServer) {
    return orchestratorActionResultSchema.parse({
      actionId: action.id,
      kind: action.kind,
      status: "skipped",
      summary: "No live runtime was available for dev-server control execution.",
      diagnostics: [`Requested strategy: ${action.inputs.requestedStrategy}`],
    });
  }

  const result = await options.controlDevServer(options.runtimeId, action.inputs.requestedStrategy);

  return orchestratorActionResultSchema.parse({
    actionId: action.id,
    kind: action.kind,
    status: "completed",
    summary: result.summary,
    artifacts: {
      strategyUsed: result.strategyUsed,
    },
    diagnostics: [],
  });
}
