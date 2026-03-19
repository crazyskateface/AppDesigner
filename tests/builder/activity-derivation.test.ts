import assert from "node:assert/strict";
import test from "node:test";

import { deriveRepairAttemptActivities, deriveRuntimeStatusActivities } from "@/lib/builder/activity/runtime-activity";
import type { RuntimeSession } from "@/lib/runtime/service/dto";

function createSession(overrides: Partial<RuntimeSession> = {}): RuntimeSession {
  return {
    runtimeId: "runtime-1",
    projectId: "project-1",
    workspaceId: "workspace-1",
    sourceSpecId: "spec-1",
    status: "starting",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

test("deriveRuntimeStatusActivities emits a readable transition when the runtime becomes running", () => {
  const items = deriveRuntimeStatusActivities(
    createSession({ status: "starting" }),
    createSession({ status: "running", previewUrl: "http://127.0.0.1:3200" }),
  );

  assert.equal(items.length, 1);
  assert.equal(items[0]?.tone, "success");
  assert.match(items[0]?.title ?? "", /preview is live/i);
});

test("deriveRepairAttemptActivities only emits new repair attempts once", () => {
  const seenAttemptIds = new Set<string>();
  const repairAttempts: NonNullable<RuntimeSession["repairAttempts"]> = [
    {
      attemptId: "repair-1",
      runtimeId: "runtime-1",
      workspaceId: "workspace-1",
      failureKind: "runtime",
      failureSignature: "sig-1",
      status: "fixed",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      logExcerpt: "browser: TypeError",
      diagnosticSummary: "Guarded the broken render path.",
      modifiedFiles: ["src/App.tsx"],
      repaired: false,
    },
  ];

  const firstPass = deriveRepairAttemptActivities(repairAttempts, seenAttemptIds);
  const secondPass = deriveRepairAttemptActivities(repairAttempts, seenAttemptIds);

  assert.equal(firstPass.length, 1);
  assert.equal(firstPass[0]?.tone, "success");
  assert.equal(secondPass.length, 0);
});
