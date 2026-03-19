import assert from "node:assert/strict";
import test from "node:test";

import { directUiEditResultSchema } from "@/lib/builder/edits/direct-ui-edit-contract";
import { resolveEditModeStrategy } from "@/lib/builder/edits/edit-mode-router";
import { getEditGenerationNoopMessage } from "@/lib/builder/edit-generation-result";
import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";

test("resolveEditModeStrategy routes common UI prompts to direct source edit", () => {
  assert.equal(
    resolveEditModeStrategy("Add a section for testimonials and add some quotes from happy customers."),
    "direct-ui-source-edit",
  );
  assert.equal(resolveEditModeStrategy("Add an embed section with a product demo video."), "direct-ui-source-edit");
  assert.equal(resolveEditModeStrategy("Reorder the sections and update the hero copy."), "direct-ui-source-edit");
});

test("resolveEditModeStrategy keeps schema-oriented page/entity edits on the AppSpec path", () => {
  assert.equal(resolveEditModeStrategy("Add a settings page with a form."), "app-spec-edit");
  assert.equal(resolveEditModeStrategy("Add an entity for customer accounts and update the navigation."), "app-spec-edit");
});

test("direct UI edit contract accepts bounded testimonials component updates", () => {
  const result = directUiEditResultSchema.parse({
    summary: "Add a testimonials section and wire it into the homepage layout.",
    files: [
      {
        path: "src/App.tsx",
        kind: "source",
        content: "import { TestimonialsSection } from './components/TestimonialsSection';\nexport default function App() { return <TestimonialsSection />; }\n",
      },
      {
        path: "src/components/TestimonialsSection.tsx",
        kind: "source",
        content: "export function TestimonialsSection() { return <section>Happy customers</section>; }\n",
      },
    ],
    notes: ["Adds a simple testimonial block."],
  });

  assert.equal(result.files.length, 2);
});

test("direct UI edit contract rejects out-of-bounds files", () => {
  assert.throws(
    () =>
      directUiEditResultSchema.parse({
        summary: "Attempt an out-of-bounds edit.",
        files: [
          {
            path: "src/lib/unsafe.ts",
            kind: "source",
            content: "export const unsafe = true;\n",
          },
        ],
        notes: [],
      }),
    /outside the allowed direct UI edit surface/i,
  );
});

test("edit no-op message no longer hardcodes testimonials-style content as unsupported structure", () => {
  const spec = generateFallbackAppSpec("Build a simple marketing site.");
  const message = getEditGenerationNoopMessage(spec, spec, "Add a testimonials section with happy customer quotes.");

  assert.match(message ?? "", /left unchanged/i);
  assert.doesNotMatch(message ?? "", /not represented yet|only supports/i);
});
