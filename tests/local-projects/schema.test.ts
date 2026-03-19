import assert from "node:assert/strict";
import test from "node:test";

import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import { persistedProjectSchema } from "@/lib/local-projects/schema";

const generatedSpec = generateFallbackAppSpec(
  "Build a CRM for a solo consultant to track leads, meetings, and follow-ups.",
);

test("persisted project schema defaults lastRuntimeId to null for older saved projects", () => {
  const parsed = persistedProjectSchema.parse({
    storageVersion: 1,
    projectId: "project-1",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    lastOpenedAt: "2026-03-19T00:00:00.000Z",
    prompt: "Build a CRM for a solo consultant.",
    generatedSpec,
    manualTitleOverride: null,
    selectedPreviewPageId: "dashboard",
  });

  assert.equal(parsed.lastRuntimeId, null);
});

test("persisted project schema preserves the last known runtime id", () => {
  const parsed = persistedProjectSchema.parse({
    storageVersion: 1,
    projectId: "project-1",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    lastOpenedAt: "2026-03-19T00:00:00.000Z",
    prompt: "Build a CRM for a solo consultant.",
    generatedSpec,
    lastRuntimeId: "runtime-123",
    manualTitleOverride: null,
    selectedPreviewPageId: "dashboard",
  });

  assert.equal(parsed.lastRuntimeId, "runtime-123");
});
