import assert from "node:assert/strict";
import test from "node:test";

import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import { createProjectBriefFromAppSpec } from "@/lib/planner/app-spec-to-project-brief";

test("createProjectBriefFromAppSpec builds a demoted planning artifact", () => {
  const spec = generateFallbackAppSpec("Build a lightweight CRM for a solo consultant to track leads and deals.");
  const brief = createProjectBriefFromAppSpec(spec);

  assert.equal(brief.source.kind, "app-spec-adapter");
  assert.equal(brief.source.referenceId, spec.appId);
  assert.equal(brief.pages.length, spec.pages.length);
  assert.equal(brief.targetKind, "vite-react-static");
});
