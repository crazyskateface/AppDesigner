export const orchestratorModeValues = ["clarify", "generate", "improve", "self-heal"] as const;

export type OrchestratorMode = (typeof orchestratorModeValues)[number];
