import assert from "node:assert/strict";
import test from "node:test";

import { deriveOperationStages } from "@/lib/builder/result/operation-stages";
import type { AppSpecGenerationMeta } from "@/lib/domain/app-spec";

const llmMeta: AppSpecGenerationMeta = { source: "llm", repaired: false };
const repairedMeta: AppSpecGenerationMeta = { source: "llm", repaired: true };
const fallbackMeta: AppSpecGenerationMeta = { source: "fallback", repaired: false, fallbackReason: "provider_error" };

test("all stages succeeded for edit with landed code verification", () => {
  const stages = deriveOperationStages({
    mode: "edit",
    generationMeta: llmMeta,
    updateResult: {
      session: {
        runtimeId: "r1",
        projectId: "p1",
        workspaceId: "w1",
        sourceSpecId: "s1",
        status: "running",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:30Z",
      },
      strategyUsed: "hot-update",
      devServerRestarted: false,
      fullRuntimeRestartRequired: false,
      workspaceChangesApplied: true,
      attemptedPaths: ["src/App.tsx"],
      appliedPaths: ["src/App.tsx"],
      updatedPaths: ["src/App.tsx"],
      editChangeSet: {
        changeSetId: "cs1",
        summary: "Update App.tsx",
        operationPaths: ["src/App.tsx"],
        rejectedPaths: [],
      },
    },
    verification: {
      request: {
        requestSummary: "Update App",
        requestedEditKind: "update-file",
        requestedArtifactHints: [],
      },
      generated: {
        generatedPaths: ["src/App.tsx"],
        normalizedPaths: ["src/App.tsx"],
        generatedFileDiffs: [{
          path: "src/App.tsx",
          changeType: "update",
          beforeContent: "old",
          generatedContent: "new",
          finalContent: "new",
          landingStatus: "landed",
        }],
        generatedChangeSummary: "Updated src/App.tsx.",
      },
      apply: {
        attemptedPaths: ["src/App.tsx"],
        appliedPaths: ["src/App.tsx"],
        workspaceChangesApplied: true,
        runtimeId: "r1",
        workspaceId: "w1",
        applyStrategy: "hot-update",
      },
      final: {
        finalPathsChecked: ["src/App.tsx"],
        observedDiffs: [{
          path: "src/App.tsx",
          changeType: "update",
          beforeContent: "old",
          generatedContent: "new",
          finalContent: "new",
          landingStatus: "landed",
        }],
        missingExpectedDiffs: [],
        overwrittenDiffs: [],
        unchangedDiffs: [],
      },
      classification: "landed",
      verifiedLandedEdits: ["Verified landed file change in src/App.tsx."],
      droppedEdits: [],
      inconclusiveEdits: [],
      summary: "Verified landed file change in src/App.tsx.",
    },
  });

  assert.equal(stages.generation.status, "succeeded");
  assert.equal(stages.apply.status, "succeeded");
  assert.equal(stages.validation.status, "succeeded");
  assert.equal(stages.runtime.status, "succeeded");
  assert.equal(stages.verification.status, "succeeded");
  assert.ok(stages.verification.evidence.length > 0);
});

test("generation partial when template fallback was used", () => {
  const stages = deriveOperationStages({
    mode: "create",
    generationMeta: fallbackMeta,
  });

  assert.equal(stages.generation.status, "partial");
  assert.match(stages.generation.detail ?? "", /fallback/i);
});

test("generation partial when LLM output was repaired", () => {
  const stages = deriveOperationStages({
    mode: "create",
    generationMeta: repairedMeta,
  });

  assert.equal(stages.generation.status, "partial");
  assert.match(stages.generation.detail ?? "", /repair/i);
});

test("apply failed stage when applyErrorMessage is set", () => {
  const stages = deriveOperationStages({
    mode: "edit",
    generationMeta: llmMeta,
    applyErrorMessage: "Could not write files.",
  });

  assert.equal(stages.apply.status, "failed");
  assert.equal(stages.apply.detail, "Could not write files.");
  assert.equal(stages.runtime.status, "skipped");
  assert.equal(stages.verification.status, "skipped");
});

test("runtime failed but workspace applied gives partial verification", () => {
  const stages = deriveOperationStages({
    mode: "create",
    generationMeta: llmMeta,
    restartedRuntimeSession: {
      runtimeId: "r1",
      projectId: "p1",
      workspaceId: "w1",
      sourceSpecId: "s1",
      status: "failed",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:30Z",
      failure: { code: "container_start_failed", message: "Container exited with code 1." },
    },
  });

  assert.equal(stages.generation.status, "succeeded");
  assert.equal(stages.apply.status, "succeeded");
  assert.equal(stages.runtime.status, "failed");
  assert.equal(stages.verification.status, "failed");
  assert.equal(stages.verification.evidence.length, 0);
});

test("no-op edit skips apply, validation, runtime, and verification", () => {
  const stages = deriveOperationStages({
    mode: "edit",
    generationMeta: llmMeta,
    noOpReason: "No supported structural change was produced.",
  });

  assert.equal(stages.generation.status, "succeeded");
  assert.equal(stages.apply.status, "skipped");
  assert.equal(stages.validation.status, "skipped");
  assert.equal(stages.runtime.status, "skipped");
  assert.equal(stages.verification.status, "skipped");
});

test("create mode with running runtime yields partial verification with evidence", () => {
  const stages = deriveOperationStages({
    mode: "create",
    generationMeta: llmMeta,
    restartedRuntimeSession: {
      runtimeId: "r1",
      projectId: "p1",
      workspaceId: "w1",
      sourceSpecId: "s1",
      status: "running",
      previewUrl: "http://localhost:3000",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:30Z",
    },
  });

  assert.equal(stages.verification.status, "partial");
  assert.ok(stages.verification.evidence.length > 0);
  assert.match(stages.verification.evidence[0], /runtime container started/i);
});

test("edit with partial change set validation yields partial validation", () => {
  const stages = deriveOperationStages({
    mode: "edit",
    generationMeta: llmMeta,
    updateResult: {
      session: {
        runtimeId: "r1",
        projectId: "p1",
        workspaceId: "w1",
        sourceSpecId: "s1",
        status: "running",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:30Z",
      },
      strategyUsed: "hot-update",
      devServerRestarted: false,
      fullRuntimeRestartRequired: false,
      workspaceChangesApplied: true,
      attemptedPaths: ["src/App.tsx", "src/pages/Dashboard.tsx"],
      appliedPaths: ["src/App.tsx"],
      updatedPaths: ["src/App.tsx"],
      editChangeSet: {
        changeSetId: "cs1",
        summary: "Update two files",
        operationPaths: ["src/App.tsx", "src/pages/Dashboard.tsx"],
        rejectedPaths: ["src/pages/Dashboard.tsx"],
      },
    },
  });

  assert.equal(stages.validation.status, "partial");
  assert.match(stages.validation.detail ?? "", /1 of 2/);
});

test("direct-ui-source-edit with landed verification yields partial verification stage", () => {
  const stages = deriveOperationStages({
    mode: "edit",
    generationMeta: llmMeta,
    editStrategy: "direct-ui-source-edit",
    updateResult: {
      session: {
        runtimeId: "r1",
        projectId: "p1",
        workspaceId: "w1",
        sourceSpecId: "s1",
        status: "running",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:30Z",
      },
      strategyUsed: "hot-update",
      devServerRestarted: false,
      fullRuntimeRestartRequired: false,
      workspaceChangesApplied: true,
      attemptedPaths: ["src/App.tsx"],
      appliedPaths: ["src/App.tsx"],
      updatedPaths: ["src/App.tsx"],
    },
    verification: {
      request: {
        requestSummary: "Replace dashboard with landing page",
        requestedEditKind: "update-file",
        requestedArtifactHints: [],
      },
      generated: {
        generatedPaths: ["src/App.tsx"],
        normalizedPaths: ["src/App.tsx"],
        generatedFileDiffs: [{
          path: "src/App.tsx",
          changeType: "update",
          beforeContent: "old",
          generatedContent: "new",
          finalContent: "new",
          landingStatus: "landed",
        }],
        generatedChangeSummary: "Updated src/App.tsx.",
      },
      apply: {
        attemptedPaths: ["src/App.tsx"],
        appliedPaths: ["src/App.tsx"],
        workspaceChangesApplied: true,
        runtimeId: "r1",
        workspaceId: "w1",
        applyStrategy: "hot-update",
      },
      final: {
        finalPathsChecked: ["src/App.tsx"],
        observedDiffs: [{
          path: "src/App.tsx",
          changeType: "update",
          beforeContent: "old",
          generatedContent: "new",
          finalContent: "new",
          landingStatus: "landed",
        }],
        missingExpectedDiffs: [],
        overwrittenDiffs: [],
        unchangedDiffs: [],
      },
      classification: "landed",
      verifiedLandedEdits: ["Verified landed file change in src/App.tsx."],
      droppedEdits: [],
      inconclusiveEdits: [],
      summary: "Verified landed file change in src/App.tsx.",
    },
  });

  assert.equal(stages.verification.status, "partial");
  assert.ok(stages.verification.evidence.length > 0);
  // Evidence should say "Applied" not "Verified landed"
  assert.ok(
    stages.verification.evidence.some((e: string) => e.includes("Applied")),
    "evidence should use 'Applied' wording for direct-ui-edits",
  );
});

test("app-spec-edit with landed verification still yields succeeded verification stage", () => {
  const stages = deriveOperationStages({
    mode: "edit",
    generationMeta: llmMeta,
    editStrategy: "app-spec-edit",
    updateResult: {
      session: {
        runtimeId: "r1",
        projectId: "p1",
        workspaceId: "w1",
        sourceSpecId: "s1",
        status: "running",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:30Z",
      },
      strategyUsed: "hot-update",
      devServerRestarted: false,
      fullRuntimeRestartRequired: false,
      workspaceChangesApplied: true,
      attemptedPaths: ["src/App.tsx"],
      appliedPaths: ["src/App.tsx"],
      updatedPaths: ["src/App.tsx"],
    },
    verification: {
      request: {
        requestSummary: "Add settings page",
        requestedEditKind: "update-file",
        requestedArtifactHints: [],
      },
      generated: {
        generatedPaths: ["src/App.tsx"],
        normalizedPaths: ["src/App.tsx"],
        generatedFileDiffs: [{
          path: "src/App.tsx",
          changeType: "update",
          beforeContent: "old",
          generatedContent: "new",
          finalContent: "new",
          landingStatus: "landed",
        }],
        generatedChangeSummary: "Updated src/App.tsx.",
      },
      apply: {
        attemptedPaths: ["src/App.tsx"],
        appliedPaths: ["src/App.tsx"],
        workspaceChangesApplied: true,
        runtimeId: "r1",
        workspaceId: "w1",
        applyStrategy: "hot-update",
      },
      final: {
        finalPathsChecked: ["src/App.tsx"],
        observedDiffs: [{
          path: "src/App.tsx",
          changeType: "update",
          beforeContent: "old",
          generatedContent: "new",
          finalContent: "new",
          landingStatus: "landed",
        }],
        missingExpectedDiffs: [],
        overwrittenDiffs: [],
        unchangedDiffs: [],
      },
      classification: "landed",
      verifiedLandedEdits: ["Verified landed file change in src/App.tsx."],
      droppedEdits: [],
      inconclusiveEdits: [],
      summary: "Verified landed file change in src/App.tsx.",
    },
  });

  assert.equal(stages.verification.status, "succeeded");
});
