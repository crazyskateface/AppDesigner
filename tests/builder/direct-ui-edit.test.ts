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

test("resolveEditModeStrategy routes page and navigation edits to direct source edit", () => {
  assert.equal(resolveEditModeStrategy("Add a settings page with a form."), "direct-ui-source-edit");
  assert.equal(resolveEditModeStrategy("Update the navigation to include a new dashboard link."), "direct-ui-source-edit");
  assert.equal(resolveEditModeStrategy("Add a table section to the main page."), "direct-ui-source-edit");
});

test("resolveEditModeStrategy returns out-of-scope for infrastructure requests", () => {
  assert.equal(resolveEditModeStrategy("Add Stripe checkout to the app."), "out-of-scope");
  assert.equal(resolveEditModeStrategy("Install a new npm package for charts."), "out-of-scope");
  assert.equal(resolveEditModeStrategy("Set up Supabase authentication."), "out-of-scope");
  assert.equal(resolveEditModeStrategy("Update the Dockerfile to use a different base image."), "out-of-scope");
  assert.equal(resolveEditModeStrategy("Add a backend API endpoint for user data."), "out-of-scope");
  assert.equal(resolveEditModeStrategy("Configure the deployment pipeline."), "out-of-scope");
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
            path: "package.json",
            kind: "source",
            content: '{ "name": "unsafe" }\n',
          },
        ],
        notes: [],
      }),
    /outside the allowed direct UI edit surface/i,
  );
});

test("direct UI edit contract accepts src/lib and src/routes files", () => {
  const result = directUiEditResultSchema.parse({
    summary: "Add a route helper and a utility.",
    files: [
      {
        path: "src/routes/Dashboard.tsx",
        kind: "source",
        content: "export default function Dashboard() { return <div>Dashboard</div>; }\n",
      },
      {
        path: "src/lib/format.ts",
        kind: "source",
        content: "export function formatDate(d: Date) { return d.toISOString(); }\n",
      },
    ],
    notes: [],
  });

  assert.equal(result.files.length, 2);
});

test("edit no-op message no longer hardcodes testimonials-style content as unsupported structure", () => {
  const spec = generateFallbackAppSpec("Build a simple marketing site.");
  const message = getEditGenerationNoopMessage(spec, spec, "Add a testimonials section with happy customer quotes.");

  assert.match(message ?? "", /left unchanged/i);
  assert.doesNotMatch(message ?? "", /not represented yet|only supports/i);
});
