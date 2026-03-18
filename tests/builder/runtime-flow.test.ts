import assert from "node:assert/strict";
import test from "node:test";

import { RuntimeReplacementError, replaceRuntimeForSpec } from "@/lib/builder/runtime-flow";
import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import type { RuntimeSession } from "@/lib/runtime/service/dto";

const candidateSpec = generateFallbackAppSpec("Build a CRM for a solo consultant.");

function createSession(overrides: Partial<RuntimeSession> = {}): RuntimeSession {
  return {
    runtimeId: "runtime-1",
    projectId: "project-1",
    workspaceId: "workspace-1",
    sourceSpecId: candidateSpec.appId,
    status: "running",
    previewUrl: "http://127.0.0.1:3000",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("replaceRuntimeForSpec stops previous runtime only after the new one starts successfully", async () => {
  const calls: string[] = [];

  const nextSession = await replaceRuntimeForSpec({
    candidateSpec,
    previousRuntime: createSession({ runtimeId: "old-runtime" }),
    startRuntime: async () => {
      calls.push("start");
      return createSession({ runtimeId: "new-runtime", status: "starting" });
    },
    awaitRuntimeReady: async (session) => {
      calls.push(`await:${session.runtimeId}`);
      return createSession({ runtimeId: "new-runtime", status: "running" });
    },
    stopRuntime: async (runtimeId) => {
      calls.push(`stop:${runtimeId}`);
    },
  });

  assert.equal(nextSession.runtimeId, "new-runtime");
  assert.deepEqual(calls, ["start", "await:new-runtime", "stop:old-runtime"]);
});

test("replaceRuntimeForSpec preserves previous runtime when the new runtime fails", async () => {
  const calls: string[] = [];

  await assert.rejects(
    () =>
      replaceRuntimeForSpec({
        candidateSpec,
        previousRuntime: createSession({ runtimeId: "old-runtime" }),
        startRuntime: async () => {
          calls.push("start");
          return createSession({ runtimeId: "failed-runtime", status: "starting" });
        },
        awaitRuntimeReady: async (session) => {
          calls.push(`await:${session.runtimeId}`);
          return createSession({
            runtimeId: "failed-runtime",
            status: "failed",
            failure: {
              code: "workspace_missing",
              message: "Workspace failed.",
            },
          });
        },
        stopRuntime: async (runtimeId) => {
          calls.push(`stop:${runtimeId}`);
        },
      }),
    RuntimeReplacementError,
  );

  assert.deepEqual(calls, ["start", "await:failed-runtime"]);
});
