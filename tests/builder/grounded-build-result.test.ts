import assert from "node:assert/strict";
import test from "node:test";

import type { AppSpec } from "@/lib/domain/app-spec";
import { deriveGroundedBuildResult } from "@/lib/builder/result/derive-result";

const generationMeta = {
  source: "llm" as const,
  repaired: false,
};

const baseSpec: AppSpec = {
  appId: "consultant-crm",
  prompt: "Build a CRM for a solo consultant to track leads and meetings.",
  title: "Consultant CRM",
  archetype: "crm",
  entities: [
    {
      id: "lead",
      name: "Lead",
      fields: [
        { key: "name", label: "Name", type: "text" },
        { key: "stage", label: "Stage", type: "status" },
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
      entityIds: ["lead"],
      sections: [
        {
          id: "stats",
          type: "stats",
          title: "Key stats",
          entityId: "lead",
          placement: "full",
          emphasis: "hero",
        },
      ],
    },
  ],
};

test("grounded build result classifies unchanged unsupported edit as no effect", () => {
  const result = deriveGroundedBuildResult({
    projectId: "project-1",
    mode: "edit",
    userPrompt: "Add a section with text and video to the dashboard.",
    generationMeta,
    previousSpec: baseSpec,
    nextSpec: baseSpec,
    noOpReason: "No supported structural change was produced from that prompt, so the app was left unchanged.",
  });

  assert.equal(result.classification, "no_effect");
  assert.match(result.assistant.message, /left unchanged/i);
  assert.deepEqual(result.applied.verifiedRequestedChanges, []);
  assert.deepEqual(result.applied.unverifiedRequestedChanges.sort(), ["text sections", "video sections"]);
});

test("grounded build result marks verified structural edit success when requested page is present", () => {
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
    generationMeta,
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

  assert.equal(result.classification, "verified_success");
  assert.deepEqual(result.applied.verifiedRequestedChanges.sort(), ["form section", "settings page"]);
  assert.match(result.assistant.message, /verified/i);
});

test("grounded build result prefers landed file verification for code-edit reporting", () => {
  const result = deriveGroundedBuildResult({
    projectId: "project-1",
    mode: "edit",
    userPrompt: "Add a TestimonialsSection component.",
    generationMeta,
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
      attemptedPaths: ["src/components/TestimonialsSection.tsx"],
      appliedPaths: ["src/components/TestimonialsSection.tsx"],
      updatedPaths: ["src/components/TestimonialsSection.tsx"],
      codeVerification: {
        generatedPaths: ["src/components/TestimonialsSection.tsx"],
        generatedFileDiffs: [
          {
            path: "src/components/TestimonialsSection.tsx",
            changeType: "create",
            beforeContent: null,
            generatedContent: "export function TestimonialsSection() { return <section>Testimonials</section>; }\n",
            finalContent: "export function TestimonialsSection() { return <section>Testimonials</section>; }\n",
            landingStatus: "landed",
          },
        ],
        finalPathsChecked: ["src/components/TestimonialsSection.tsx"],
        observedDiffs: [
          {
            path: "src/components/TestimonialsSection.tsx",
            changeType: "create",
            beforeContent: null,
            generatedContent: "export function TestimonialsSection() { return <section>Testimonials</section>; }\n",
            finalContent: "export function TestimonialsSection() { return <section>Testimonials</section>; }\n",
            landingStatus: "landed",
          },
        ],
        landedPaths: ["src/components/TestimonialsSection.tsx"],
        missingPaths: [],
        overwrittenPaths: [],
        unchangedPaths: [],
      },
    },
  });

  assert.equal(result.classification, "verified_success");
  assert.match(result.assistant.message, /landed file change/i);
  assert.equal(result.memory.updateProjectState, true);
});

test("grounded build result classifies create-mode as partial_success with runtime-only verification", () => {
  const result = deriveGroundedBuildResult({
    projectId: "project-1",
    mode: "create",
    userPrompt: "Build a CRM for a solo consultant.",
    generationMeta,
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

  assert.equal(result.classification, "partial_success");
  assert.equal(result.stages.verification.status, "partial");
  assert.ok(result.stages.verification.evidence.length > 0);
  assert.match(result.stages.verification.evidence[0], /runtime container started/i);
  assert.equal(result.assistant.tone, "success");
  assert.match(result.assistant.message, /created/i);
  assert.doesNotMatch(result.assistant.message, /verified/i);
  // Project state should still update for successful creates
  assert.equal(result.memory.updateProjectState, true);
  // But no optimistic durable facts should be stored
  assert.equal(result.memory.durableFacts.length, 0);
});

test("grounded build result exposes explicit stage statuses for a successful edit", () => {
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
    generationMeta,
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

  assert.equal(result.stages.generation.status, "succeeded");
  assert.equal(result.stages.apply.status, "succeeded");
  assert.equal(result.stages.runtime.status, "succeeded");
  // Verification is partial because there's no code-level diff verification, only structural matching
  assert.ok(result.stages.verification.status === "partial" || result.stages.verification.status === "succeeded");
});

test("grounded build result classifies create-mode runtime failure with failed stages", () => {
  const result = deriveGroundedBuildResult({
    projectId: "project-1",
    mode: "create",
    userPrompt: "Build a CRM for a solo consultant.",
    generationMeta,
    nextSpec: baseSpec,
    restartedRuntimeSession: {
      runtimeId: "runtime-1",
      projectId: "project-1",
      workspaceId: "workspace-1",
      sourceSpecId: baseSpec.appId,
      status: "failed",
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:30.000Z",
      failure: { code: "container_start_failed", message: "Container exited with code 1." },
    },
  });

  assert.equal(result.stages.generation.status, "succeeded");
  assert.equal(result.stages.runtime.status, "failed");
  assert.equal(result.stages.verification.status, "failed");
  assert.equal(result.stages.verification.evidence.length, 0);
  assert.equal(result.classification, "partial_success");
});

// --- Direct-UI-Source-Edit honesty tests ---

const directUiEditLandedInput = () => ({
  projectId: "project-1",
  mode: "edit" as const,
  userPrompt: "Replace the dashboard with a landing page hero section.",
  generationMeta,
  previousSpec: baseSpec,
  nextSpec: baseSpec, // AppSpec unchanged for direct-ui-source-edits
  editStrategy: "direct-ui-source-edit" as const,
  updateResult: {
    session: {
      runtimeId: "runtime-1",
      projectId: "project-1",
      workspaceId: "workspace-1",
      sourceSpecId: baseSpec.appId,
      status: "running" as const,
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:30.000Z",
    },
    strategyUsed: "hot-update" as const,
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
          changeType: "update" as const,
          beforeContent: "// old dashboard code",
          generatedContent: "// new landing page hero",
          finalContent: "// new landing page hero",
          landingStatus: "landed" as const,
        },
      ],
      finalPathsChecked: ["src/App.tsx"],
      observedDiffs: [
        {
          path: "src/App.tsx",
          changeType: "update" as const,
          beforeContent: "// old dashboard code",
          generatedContent: "// new landing page hero",
          finalContent: "// new landing page hero",
          landingStatus: "landed" as const,
        },
      ],
      landedPaths: ["src/App.tsx"],
      missingPaths: [],
      overwrittenPaths: [],
      unchangedPaths: [],
    },
  },
});

test("direct-ui-source-edit with landed verification classifies as partial_success", () => {
  const result = deriveGroundedBuildResult(directUiEditLandedInput());
  assert.equal(result.classification, "partial_success");
});

test("direct-ui-source-edit with landed verification produces no durable facts", () => {
  const result = deriveGroundedBuildResult(directUiEditLandedInput());
  assert.equal(result.memory.durableFacts.length, 0);
});

test("direct-ui-source-edit verification stage is partial when files landed", () => {
  const result = deriveGroundedBuildResult(directUiEditLandedInput());
  assert.equal(result.stages.verification.status, "partial");
  assert.ok(result.stages.verification.evidence.length > 0);
  // Evidence should describe file application, not verification
  assert.ok(
    result.stages.verification.evidence.some((e: string) => e.includes("Applied")),
    "evidence should use 'Applied' instead of 'Verified landed'",
  );
});

test("direct-ui-source-edit assistant summary does not claim verified success", () => {
  const result = deriveGroundedBuildResult(directUiEditLandedInput());
  // Should NOT claim the edit was "verified" as a success claim
  assert.doesNotMatch(result.assistant.message, /\bverified\b(?! the visual| that the visual)/i);
  // Should explicitly say visual result has NOT been verified
  assert.ok(
    result.assistant.message.includes("not verified") || result.assistant.message.includes("have not verified"),
    "assistant should be explicit about unverified visual result",
  );
});

test("app-spec-edit with landed verification still classifies as verified_success", () => {
  const result = deriveGroundedBuildResult({
    ...directUiEditLandedInput(),
    editStrategy: "app-spec-edit",
  });
  assert.equal(result.classification, "verified_success");
});
