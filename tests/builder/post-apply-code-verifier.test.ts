import assert from "node:assert/strict";
import test from "node:test";

import { derivePostApplyCodeVerification } from "@/lib/builder/verification/post-apply-code-verifier";

test("post-apply code verifier marks a requested component file change as landed", () => {
  const verification = derivePostApplyCodeVerification("Add a TestimonialsSection component.", {
    session: {
      runtimeId: "runtime-1",
      projectId: "project-1",
      workspaceId: "workspace-1",
      sourceSpecId: "app-1",
      status: "running",
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:10.000Z",
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
  });

  assert.equal(verification?.classification, "landed");
  assert.match(verification?.summary ?? "", /landed/i);
});

test("post-apply code verifier reports not landed when the final file stayed unchanged", () => {
  const verification = derivePostApplyCodeVerification("Update the Header component.", {
    session: {
      runtimeId: "runtime-1",
      projectId: "project-1",
      workspaceId: "workspace-1",
      sourceSpecId: "app-1",
      status: "running",
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:10.000Z",
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
          beforeContent: "export function Header() { return <header>Old</header>; }\n",
          generatedContent: "export function Header() { return <header>New</header>; }\n",
          finalContent: "export function Header() { return <header>Old</header>; }\n",
          landingStatus: "unchanged",
        },
      ],
      finalPathsChecked: ["src/components/Header.tsx"],
      observedDiffs: [
        {
          path: "src/components/Header.tsx",
          changeType: "update",
          beforeContent: "export function Header() { return <header>Old</header>; }\n",
          generatedContent: "export function Header() { return <header>New</header>; }\n",
          finalContent: "export function Header() { return <header>Old</header>; }\n",
          landingStatus: "unchanged",
        },
      ],
      landedPaths: [],
      missingPaths: [],
      overwrittenPaths: [],
      unchangedPaths: ["src/components/Header.tsx"],
    },
  });

  assert.equal(verification?.classification, "not_landed");
  assert.match(verification?.summary ?? "", /could not verify/i);
});
