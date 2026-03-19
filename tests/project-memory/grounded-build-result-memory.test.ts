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
