import assert from "node:assert/strict";
import test from "node:test";

import { normalizeGeneratedFixBundleCandidate } from "@/lib/codegen/fixes/fix-bundle-normalize";
import { createProjectBriefFromAppSpec } from "@/lib/planner/app-spec-to-project-brief";
import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import type { DiagnosticArtifact } from "@/lib/runtime/diagnostics/diagnostic-artifact";

const projectBrief = createProjectBriefFromAppSpec(
  generateFallbackAppSpec("Build a CRM for a solo consultant to track leads, meetings, and follow-ups."),
);

function createDiagnostic(): DiagnosticArtifact {
  return {
    diagnosticId: "diagnostic-1",
    inspectionId: "inspection-1",
    failureKind: "runtime",
    runtimeFailure: {
      code: "client_runtime_failed",
      message: "Missing named export",
    },
    logExcerpt: "browser: SyntaxError: The requested module '/src/app-meta.ts' does not provide an export named 'appMeta'",
    stackExcerpt: "at App (App.tsx:2:10)",
    allowedFiles: ["src/App.tsx", "src/app-meta.ts", "src/styles.css"],
    currentFiles: [],
    projectBrief,
    generatedFileMetadata: {
      sourceKind: "project-brief",
      sourceId: projectBrief.briefId,
      generation: {
        scaffold: "deterministic",
        appFiles: "llm",
        repaired: false,
      },
    },
    attemptNumber: 1,
  };
}

test("fix bundle normalization repairs src/app-meta.ts back to the canonical named export", () => {
  const result = normalizeGeneratedFixBundleCandidate(
    {
      fixId: "fix-1",
      diagnosticId: "diagnostic-1",
      reasoningSummary: "Rewrite the app meta module.",
      files: [
        {
          path: "src/app-meta.ts",
          kind: "source",
          content: "export default {};",
        },
      ],
    },
    createDiagnostic(),
  );

  assert.equal(result.files?.length, 1);
  assert.match(result.files?.[0]?.content ?? "", /export const appMeta =/);
  assert.doesNotMatch(result.files?.[0]?.content ?? "", /export default/);
});
