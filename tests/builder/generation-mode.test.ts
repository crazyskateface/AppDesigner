import assert from "node:assert/strict";
import test from "node:test";

import { resolveBuilderMode } from "@/lib/builder/generation-mode";
import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";

test("resolveBuilderMode returns create when no current spec exists", () => {
  assert.equal(resolveBuilderMode(null), "create");
});

test("resolveBuilderMode returns edit when a current spec exists", () => {
  assert.equal(resolveBuilderMode(generateFallbackAppSpec("Build a CRM for a solo consultant.")), "edit");
});
