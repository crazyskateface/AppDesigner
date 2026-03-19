import assert from "node:assert/strict";
import test from "node:test";

import { planOrchestratorActions } from "@/lib/applications/orchestrator/actions/planner";
import { executeDevServerControlAction } from "@/lib/applications/orchestrator/executors/dev-server-control-executor";
import { executeRuntimeInspectionAction } from "@/lib/applications/orchestrator/executors/runtime-inspection-executor";
import { executeActionPlan } from "@/lib/applications/orchestrator/step-runner";
import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { loadOrchestratorApplicationContext } from "@/lib/applications/orchestrator/context-loader";

class StubProvider implements StructuredObjectGenerator {
  async generateStructuredObject() {
    return {
      content: {
        bundleId: "inventory-bundle",
        targetKind: "vite-react-static",
        entryModule: "src/App.tsx",
        files: [
          {
            path: "src/project-brief.ts",
            kind: "source",
            content: "export const projectBrief = { title: 'Inventory Hub' };",
          },
          {
            path: "src/App.tsx",
            kind: "source",
            content: "export default function App() { return <main>Inventory Hub</main>; }",
          },
          {
            path: "src/styles.css",
            kind: "source",
            content: "main { padding: 24px; }",
          },
        ],
        packageRequirements: [
          {
            name: "chart.js",
            section: "dependencies",
          },
        ],
        notes: ["Generated app files."],
      },
      provider: {
        name: "stub",
        model: "stub-model",
      },
    };
  }
}

test("planOrchestratorActions creates a file action for normal generate flows", async () => {
  const spec = generateFallbackAppSpec("Build an inventory app and install chart.js for charts.");
  const context = loadOrchestratorApplicationContext({
    projectId: "project-1",
    appSpec: spec,
    mode: "generate",
  });
  const plan = await planOrchestratorActions(context);

  assert.equal(plan.actions.some((action) => action.kind === "file.write-set"), true);
  assert.equal(plan.actions.some((action) => action.kind === "dependency.change-set"), false);
});

test("executeRuntimeInspectionAction returns structured evidence without raw terminal control", () => {
  const result = executeRuntimeInspectionAction(
    {
      id: "inspect-1",
      kind: "runtime.inspect",
      reason: "Inspect runtime state.",
      executionPolicy: "execute",
      safety: {
        maxLogEntries: 2,
      },
      inputs: {
        requestedEvidence: ["runtime-status", "recent-logs", "browser-runtime-error"],
      },
    },
    {
      runtimeId: "runtime-1",
      status: "running",
      browserRuntimeError: "ReferenceError: foo is not defined",
      recentLogs: ["line-1", "line-2", "line-3"],
      repairAttemptSummaries: [],
    },
  );

  assert.equal(result.status, "completed");
  assert.deepEqual(
    (result.artifacts?.inspection as { recentLogs: string[] }).recentLogs,
    ["line-1", "line-2"],
  );
});

test("executeActionPlan derives executable dependency changes from LLM package requirements", async () => {
  const spec = generateFallbackAppSpec("Build an inventory app and install chart.js for charts.");
  const context = loadOrchestratorApplicationContext({
    projectId: "project-1",
    appSpec: spec,
    mode: "generate",
  });
  const plan = await planOrchestratorActions(context);
  const results = await executeActionPlan(plan, context, {
    provider: new StubProvider(),
    fallback: "template",
  });

  assert.equal(results.some((result) => result.kind === "file.write-set" && result.status === "completed"), true);
  assert.equal(results.some((result) => result.kind === "dependency.change-set" && result.status === "completed"), true);
});

test("planOrchestratorActions prepends runtime inspection for self-heal contexts with inspection evidence", async () => {
  const spec = generateFallbackAppSpec("Repair the running inventory app.");
  const context = loadOrchestratorApplicationContext({
    projectId: "project-1",
    appSpec: spec,
    mode: "self-heal",
    runtimeInspection: {
      runtimeId: "runtime-1",
      status: "failed",
      lastFailure: "ReferenceError: broken is not defined",
      recentLogs: ["src/App.tsx: ReferenceError"],
      repairAttemptSummaries: ["Previous repair failed."],
    },
  });
  const plan = await planOrchestratorActions(context);

  assert.equal(plan.actions[0]?.kind, "runtime.inspect");
  assert.equal(plan.actions[1]?.kind, "dev-server.control");
  assert.equal(plan.actions[2]?.kind, "file.write-set");
});

test("executeDevServerControlAction runs through the bounded control callback when available", async () => {
  const result = await executeDevServerControlAction(
    {
      id: "server-1",
      kind: "dev-server.control",
      reason: "Restart the dev server.",
      executionPolicy: "execute",
      safety: {
        allowDirectExecution: true,
      },
      inputs: {
        requestedStrategy: "dev-server-restart",
      },
    },
    {
      runtimeId: "runtime-1",
      controlDevServer: async () => ({
        strategyUsed: "dev-server-restart",
        summary: "Restarted the dev server inside the existing container.",
      }),
    },
  );

  assert.equal(result.status, "completed");
  assert.match(result.summary, /restarted the dev server/i);
});
