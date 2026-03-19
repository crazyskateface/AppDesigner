import assert from "node:assert/strict";
import test from "node:test";

import { resolveBuilderGenerateRequest } from "@/lib/builder/generation/resolve-request";
import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import type { StructuredGenerationRequest, StructuredObjectGenerator } from "@/lib/llm/types";

class StubProvider implements StructuredObjectGenerator {
  constructor(private readonly handlers: Record<string, unknown>) {}

  async generateStructuredObject(input: StructuredGenerationRequest) {
    return {
      content: this.handlers[input.schemaName],
      provider: {
        name: "stub",
        model: "stub-model",
      },
    };
  }
}

test("builder generation request returns clarification_required when the clarify gate asks questions", async () => {
  const response = await resolveBuilderGenerateRequest(
    {
      prompt: "Build an app for my business team.",
      mode: "create",
      clarificationAnswers: [],
    },
    {
      provider: new StubProvider({
        clarification_decision: {
          decision: "ask-clarify",
          summary: "The prompt needs more product detail.",
          questions: [
            {
              id: "clarification-audience",
              label: "Who is this app for?",
              required: true,
            },
          ],
        },
      }),
    },
  );

  assert.equal(response.status, "clarification_required");
  assert.equal(response.clarification.questions.length, 1);
});

test("builder generation request returns generation_ready once the request is buildable", async () => {
  const appSpec = generateFallbackAppSpec("Build a CRM for a solo consultant to track leads and meetings.");

  const response = await resolveBuilderGenerateRequest(
    {
      prompt: "Build a CRM for a solo consultant.",
      mode: "create",
      clarificationAnswers: [],
    },
    {
      provider: new StubProvider({
        clarification_decision: {
          decision: "build-now",
          summary: "Ready to build.",
          questions: [],
        },
        app_spec: appSpec,
      }),
    },
  );

  assert.equal(response.status, "generation_ready");
  assert.equal(response.appSpec.title, appSpec.title);
});

test("builder generation request proceeds after one answered clarification batch instead of throwing", async () => {
  const appSpec = generateFallbackAppSpec("Build a CRM for a small operations team to track leads and meetings.");

  const response = await resolveBuilderGenerateRequest(
    {
      prompt: "Build an app for my business team.",
      mode: "create",
      clarificationAnswers: [
        {
          questionId: "clarification-audience",
          label: "Who is this app for?",
          answer: "A small operations team.",
        },
        {
          questionId: "clarification-workflow",
          label: "What are the main workflows?",
          answer: "Track leads, meetings, and follow-ups.",
        },
        {
          questionId: "clarification-shape",
          label: "What kind of product should this feel like?",
          answer: "A CRM dashboard.",
        },
      ],
    },
    {
      provider: new StubProvider({
        clarification_decision: {
          decision: "ask-clarify",
          summary: "The prompt still looks broad.",
          questions: [
            {
              id: "clarification-extra",
              label: "Extra question",
              required: true,
            },
          ],
        },
        app_spec: appSpec,
      }),
    },
  );

  assert.equal(response.status, "generation_ready");
  assert.equal(response.appSpec.title, appSpec.title);
});

test("builder generation request uses direct source edit mode for common UI edit prompts", async () => {
  const currentSpec = generateFallbackAppSpec("Build a landing page for a furniture brand.");

  globalThis.__appDesignerRuntimeService__ = {
    getRuntimeWorkspaceFiles() {
      return {
        runtimeId: "runtime-1",
        workspaceId: "workspace-1",
        files: [
          {
            path: "src/App.tsx",
            kind: "source",
            content: "export default function App() { return <main>Furniture Punks</main>; }\n",
          },
          {
            path: "src/styles.css",
            kind: "source",
            content: "body { font-family: sans-serif; }\n",
          },
        ],
      };
    },
  } as never;

  const response = await resolveBuilderGenerateRequest(
    {
      prompt: "Add a testimonials section with happy customer quotes to the landing page.",
      mode: "edit",
      currentSpec,
      runtimeId: "runtime-1",
      clarificationAnswers: [],
    },
    {
      provider: new StubProvider({
        clarification_decision: {
          decision: "build-now",
          summary: "Ready to edit.",
          questions: [],
        },
        direct_ui_edit: {
          summary: "Update the landing page source with a testimonials section.",
          files: [
            {
              path: "src/App.tsx",
              kind: "source",
              content: "export default function App() { return <main><section>Testimonials</section></main>; }\n",
            },
          ],
          notes: [],
        },
      }),
    },
  );

  assert.equal(response.status, "generation_ready");
  assert.equal(response.appSpec.title, currentSpec.title);
  assert.equal(response.directEdit?.strategy, "direct-ui-source-edit");
  assert.match(response.assistantMessage, /prepared a direct source edit/i);
});

test("builder generation request routes page edits through direct source edit", async () => {
  const currentSpec = generateFallbackAppSpec("Build a CRM for a solo consultant.");

  globalThis.__appDesignerRuntimeService__ = {
    getRuntimeWorkspaceFiles() {
      return {
        runtimeId: "runtime-1",
        workspaceId: "workspace-1",
        files: [
          {
            path: "src/App.tsx",
            kind: "source" as const,
            content: "export default function App() { return <main>CRM</main>; }\n",
          },
          {
            path: "src/styles.css",
            kind: "source" as const,
            content: "body { font-family: sans-serif; }\n",
          },
        ],
      };
    },
  } as never;

  const response = await resolveBuilderGenerateRequest(
    {
      prompt: "Add a settings page with a form.",
      mode: "edit",
      currentSpec,
      runtimeId: "runtime-1",
      clarificationAnswers: [],
    },
    {
      provider: new StubProvider({
        clarification_decision: {
          decision: "build-now",
          summary: "Ready to edit.",
          questions: [],
        },
        direct_ui_edit: {
          summary: "Added a settings page with a basic form.",
          files: [
            {
              path: "src/pages/SettingsPage.tsx",
              kind: "source",
              content: "export default function SettingsPage() { return <main><form><label>Name</label><input /></form></main>; }\n",
            },
            {
              path: "src/App.tsx",
              kind: "source",
              content: "import SettingsPage from './pages/SettingsPage';\nexport default function App() { return <main>CRM<SettingsPage /></main>; }\n",
            },
          ],
          notes: [],
        },
      }),
    },
  );

  assert.equal(response.status, "generation_ready");
  assert.equal(response.directEdit?.strategy, "direct-ui-source-edit");
  assert.match(response.assistantMessage, /prepared a direct source edit/i);
});

test("builder generation request returns unchanged for out-of-scope infrastructure requests", async () => {
  const currentSpec = generateFallbackAppSpec("Build a CRM for a solo consultant.");

  const response = await resolveBuilderGenerateRequest(
    {
      prompt: "Add Stripe checkout integration for payments.",
      mode: "edit",
      currentSpec,
      runtimeId: "runtime-1",
      clarificationAnswers: [],
    },
    {
      provider: new StubProvider({
        clarification_decision: {
          decision: "build-now",
          summary: "Ready to proceed.",
          questions: [],
        },
      }),
    },
  );

  assert.equal(response.status, "generation_ready");
  assert.equal(response.changeStatus, "unchanged");
  assert.equal(response.directEdit, undefined);
  assert.match(response.assistantMessage, /outside the app source tree/i);
});
