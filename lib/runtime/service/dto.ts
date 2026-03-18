import { z } from "zod";

import { appSpecSchema } from "@/lib/domain/app-spec";
import type { RunnerStatus } from "@/lib/runtime/contracts";
import type { RuntimeFailure, RuntimeLogEntry } from "@/lib/runtime/logs";

export const startRuntimeInputSchema = z.object({
  projectId: z.string().min(1),
  generatedSpec: appSpecSchema,
});

export type StartRuntimeInput = z.infer<typeof startRuntimeInputSchema>;

export type RuntimeSession = {
  runtimeId: string;
  projectId: string;
  workspaceId: string;
  sourceSpecId: string;
  status: Exclude<RunnerStatus, "idle">;
  previewUrl?: string;
  createdAt: string;
  updatedAt: string;
  failure?: RuntimeFailure;
};

export type RuntimeLogPage = {
  runtimeId: string;
  entries: RuntimeLogEntry[];
};
