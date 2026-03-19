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
