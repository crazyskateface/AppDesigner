import assert from "node:assert/strict";
import test from "node:test";

import { deriveGroundedBuildResult } from "@/lib/builder/result/derive-result";
import { createEmptyProjectBuildMemory, rememberGroundedBuildResult } from "@/lib/project-memory/update-memory";
import type { AppSpec } from "@/lib/domain/app-spec";

const baseSpec: AppSpec = {
  appId: "inventory-app",
  prompt: "Build an inventory dashboard.",
  title: "Inventory Hub",
  archetype: "inventory",
  entities: [
    {
      id: "item",
      name: "Item",
      fields: [
        { key: "name", label: "Name", type: "text" },
        { key: "stock", label: "Stock", type: "number" },
      ],
    },
  ],
  navigation: [{ id: "dashboard-nav", label: "Dashboard", pageId: "dashboard" }],
  pages: [
    {
      id: "dashboard",
      title: "Dashboard",
      pageType: "dashboard",
      pageLayout: "dashboard",
      entityIds: ["item"],
      sections: [
        {
          id: "stats",
          type: "stats",
          title: "Inventory",
          entityId: "item",
          placement: "full",
          emphasis: "hero",
        },
      ],
    },
  ],
};

test("project memory stores verified durable facts from grounded build results", () => {
  const nextSpec: AppSpec = {
    ...baseSpec,
    navigation: [...baseSpec.navigation, { id: "settings-nav", label: "Settings", pageId: "settings" }],
    pages: [
      ...baseSpec.pages,
      {
        id: "settings",
        title: "Settings",
        pageType: "settings",
        pageLayout: "stack",
        entityIds: [],
        sections: [
          {
            id: "settings-form",
            type: "form",
            title: "Settings",
            placement: "main",
            emphasis: "default",
          },
        ],
      },
    ],
  };
  const result = deriveGroundedBuildResult({
    projectId: "project-1",
    mode: "edit",
    userPrompt: "Add a settings page with a form.",
    generationMeta: {
      source: "llm",
      repaired: false,
    },
    previousSpec: baseSpec,
    nextSpec,
    updateResult: {
      session: {
        runtimeId: "runtime-1",
        projectId: "project-1",
        workspaceId: "workspace-1",
        sourceSpecId: nextSpec.appId,
        status: "running",
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:30.000Z",
      },
      strategyUsed: "hot-update",
      devServerRestarted: false,
      fullRuntimeRestartRequired: false,
      workspaceChangesApplied: true,
      attemptedPaths: ["src/App.tsx"],
      appliedPaths: ["src/App.tsx"],
      updatedPaths: ["src/App.tsx"],
    },
  });

  const memoryResult = rememberGroundedBuildResult(createEmptyProjectBuildMemory("project-1"), {
    result,
    timestamp: "2026-03-19T00:01:00.000Z",
  });

  assert.equal(memoryResult.memory.projectState.appTitle, "Inventory Hub");
  assert.equal(memoryResult.memory.decisions.some((decision) => /Verified settings page/i.test(decision.summary)), true);
  assert.equal(memoryResult.memory.recentOutcomes.at(-1)?.kind, "generation-succeeded");
  assert.match(memoryResult.memory.recentOutcomes.at(-1)?.summary ?? "", /verified/i);
});

test("project memory does not store landed success facts when the edit did not land", () => {
  const result = deriveGroundedBuildResult({
    projectId: "project-1",
    mode: "edit",
    userPrompt: "Update the Header component.",
    generationMeta: {
      source: "llm",
      repaired: false,
    },
    previousSpec: baseSpec,
    nextSpec: baseSpec,
    updateResult: {
      session: {
        runtimeId: "runtime-1",
        projectId: "project-1",
        workspaceId: "workspace-1",
        sourceSpecId: baseSpec.appId,
        status: "running",
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:30.000Z",
      },
      strategyUsed: "hot-update",
      devServerRestarted: false,
      fullRuntimeRestartRequired: false,
      workspaceChangesApplied: true,
      attemptedPaths: ["src/components/Header.tsx"],
      appliedPaths: ["src/components/Header.tsx"],
      updatedPaths: ["src/components/Header.tsx"],
      codeVerification: {
        generatedPaths: ["src/components/Header.tsx"],
        generatedFileDiffs: [
          {
            path: "src/components/Header.tsx",
            changeType: "update",
            beforeContent: "old\n",
            generatedContent: "new\n",
            finalContent: "old\n",
            landingStatus: "unchanged",
          },
        ],
        finalPathsChecked: ["src/components/Header.tsx"],
        observedDiffs: [
          {
            path: "src/components/Header.tsx",
            changeType: "update",
            beforeContent: "old\n",
            generatedContent: "new\n",
            finalContent: "old\n",
            landingStatus: "unchanged",
          },
        ],
        landedPaths: [],
        missingPaths: [],
        overwrittenPaths: [],
        unchangedPaths: ["src/components/Header.tsx"],
      },
    },
  });

  const memoryResult = rememberGroundedBuildResult(createEmptyProjectBuildMemory("project-1"), {
    result,
    timestamp: "2026-03-19T00:01:00.000Z",
  });

  assert.equal(memoryResult.memory.decisions.length, 0);
  assert.equal(memoryResult.memory.recentOutcomes.at(-1)?.kind, "generation-failed");
  assert.match(memoryResult.memory.recentOutcomes.at(-1)?.summary ?? "", /could not verify/i);
});

test("project memory omits durable facts for create-mode where verification is only partial", () => {
  const result = deriveGroundedBuildResult({
    projectId: "project-1",
    mode: "create",
    userPrompt: "Build an inventory dashboard.",
    generationMeta: {
      source: "llm",
      repaired: false,
    },
    nextSpec: baseSpec,
    restartedRuntimeSession: {
      runtimeId: "runtime-1",
      projectId: "project-1",
      workspaceId: "workspace-1",
      sourceSpecId: baseSpec.appId,
      status: "running",
      previewUrl: "http://localhost:3000",
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:30.000Z",
    },
  });

  // Verification should be partial — runtime-only evidence, no file-level checks
  assert.equal(result.stages.verification.status, "partial");

  const memoryResult = rememberGroundedBuildResult(createEmptyProjectBuildMemory("project-1"), {
    result,
    timestamp: "2026-03-19T00:01:00.000Z",
  });

  // Durable facts should be empty — no verified evidence
  assert.equal(result.memory.durableFacts.length, 0);
  assert.equal(memoryResult.memory.decisions.length, 0);
  // Project state should still be updated
  assert.equal(memoryResult.memory.projectState.appTitle, "Inventory Hub");
  // Outcome should still be recorded as success
  assert.equal(memoryResult.memory.recentOutcomes.at(-1)?.kind, "generation-succeeded");
});

test("project memory omits durable facts for direct-ui-source-edit with landed verification", () => {
  const result = deriveGroundedBuildResult({
    projectId: "project-1",
    mode: "edit",
    userPrompt: "Replace the dashboard with a landing page hero section.",
    generationMeta: {
      source: "llm",
      repaired: false,
    },
    previousSpec: baseSpec,
    nextSpec: baseSpec, // AppSpec unchanged for direct-ui-source-edits
    editStrategy: "direct-ui-source-edit",
    updateResult: {
      session: {
        runtimeId: "runtime-1",
        projectId: "project-1",
        workspaceId: "workspace-1",
        sourceSpecId: baseSpec.appId,
        status: "running",
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:30.000Z",
      },
      strategyUsed: "hot-update",
      devServerRestarted: false,
      fullRuntimeRestartRequired: false,
      workspaceChangesApplied: true,
      attemptedPaths: ["src/App.tsx"],
      appliedPaths: ["src/App.tsx"],
      updatedPaths: ["src/App.tsx"],
      codeVerification: {
        generatedPaths: ["src/App.tsx"],
        generatedFileDiffs: [
          {
            path: "src/App.tsx",
            changeType: "update",
            beforeContent: "// old dashboard",
            generatedContent: "// new landing hero",
            finalContent: "// new landing hero",
            landingStatus: "landed",
          },
        ],
        finalPathsChecked: ["src/App.tsx"],
        observedDiffs: [
          {
            path: "src/App.tsx",
            changeType: "update",
            beforeContent: "// old dashboard",
            generatedContent: "// new landing hero",
            finalContent: "// new landing hero",
            landingStatus: "landed",
          },
        ],
        landedPaths: ["src/App.tsx"],
        missingPaths: [],
        overwrittenPaths: [],
        unchangedPaths: [],
      },
    },
  });

  assert.equal(result.classification, "partial_success");
  assert.equal(result.memory.durableFacts.length, 0);

  const memoryResult = rememberGroundedBuildResult(createEmptyProjectBuildMemory("project-1"), {
    result,
    timestamp: "2026-03-19T00:01:00.000Z",
  });

  // No durable facts → no decisions stored
  assert.equal(memoryResult.memory.decisions.length, 0);
  // Outcome should still be recorded, but not as verified success
  const latestOutcome = memoryResult.memory.recentOutcomes.at(-1);
  assert.ok(latestOutcome);
  // The summary should NOT claim verified success — but it may say "not verified"
  assert.doesNotMatch(latestOutcome?.summary ?? "", /^verified/i);
  assert.ok(
    (latestOutcome?.summary ?? "").includes("not verified") || !(latestOutcome?.summary ?? "").includes("verified"),
    "outcome should not claim verified success",
  );
});
