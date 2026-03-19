import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import type { GenerationPipeline } from "@/lib/generation/pipeline";
import { createProjectBriefFromAppSpec } from "@/lib/planner/app-spec-to-project-brief";
import type { Runner, RunnerHandle, RunnerStatus, RuntimeTarget } from "@/lib/runtime/contracts";
import type { RuntimeLogEntry } from "@/lib/runtime/logs";
import { LocalRuntimeService } from "@/lib/runtime/service/local-runtime-service";
import { InMemoryRuntimeSessionStore } from "@/lib/runtime/store/in-memory-runtime-store";
import type { MaterializedWorkspace, WorkspaceManifest, WorkspacePlan } from "@/lib/workspace/model";
import { createRuntimeControlFiles } from "@/lib/workspace/templates/vite-react/runtime-control-files";

const candidateSpec = generateFallbackAppSpec("Build a CRM for a solo consultant to track leads, follow-ups, and meetings.");
const projectBrief = createProjectBriefFromAppSpec(candidateSpec);

const manifest: WorkspaceManifest = {
  packageManager: "npm",
  installCommand: ["npm", "install"],
  devCommand: ["npm", "run", "dev", "--", "--host", "0.0.0.0"],
  buildCommand: ["npm", "run", "build"],
  containerPort: 3000,
  dockerfilePath: "Dockerfile",
};

function createPlan(workspaceId: string, appContent: string): WorkspacePlan {
  return {
    projectId: "project-1",
    workspaceId,
    sourceSpecId: candidateSpec.appId,
    targetKind: "vite-react-static",
    title: "CRM",
    relativeRootPath: workspaceId,
    manifest,
    files: [
      {
        path: "src/App.tsx",
        kind: "source",
        content: appContent,
      },
      {
        path: "src/styles.css",
        kind: "source",
        content: "body { font-family: sans-serif; }",
      },
      {
        path: "src/project-brief.ts",
        kind: "source",
        content: "export const projectBrief = {};",
      },
    ],
    generationContext: {
      projectBrief,
      fileSetMetadata: {
        sourceKind: "project-brief",
        sourceId: projectBrief.briefId,
        generation: {
          scaffold: "deterministic",
          appFiles: "llm",
          repaired: false,
          provider: {
            name: "test-provider",
            model: "test-model",
          },
        },
      },
    },
  };
}

function createWorkspace(plan: WorkspacePlan): MaterializedWorkspace {
  return {
    projectId: plan.projectId,
    workspaceId: plan.workspaceId,
    sourceSpecId: plan.sourceSpecId,
    targetKind: plan.targetKind,
    title: plan.title,
    relativeRootPath: plan.relativeRootPath,
    absoluteRootPath: `C:\\generated\\${plan.workspaceId}`,
    manifest: plan.manifest,
    files: plan.files,
    writtenAt: new Date().toISOString(),
    generationContext: plan.generationContext,
  };
}

function withRuntimeControls(plan: WorkspacePlan): WorkspacePlan {
  return {
    ...plan,
    files: [...plan.files, ...createRuntimeControlFiles(plan.manifest.containerPort)],
  };
}

function createTarget(workspace: MaterializedWorkspace): RuntimeTarget {
  return {
    projectId: workspace.projectId,
    workspaceId: workspace.workspaceId,
    workspacePath: workspace.absoluteRootPath,
    previewUrl: `http://127.0.0.1:${workspace.workspaceId === "workspace-fixed" ? 3201 : 3200}`,
    hostPort: workspace.workspaceId === "workspace-fixed" ? 3201 : 3200,
    containerPort: 3000,
  };
}

function createHandle(target: RuntimeTarget): RunnerHandle {
  return {
    runId: `run-${target.workspaceId}`,
    target,
  };
}

test("LocalRuntimeService repairs a failed generated app and records the successful attempt", async () => {
  const plannedWorkspaces: WorkspacePlan[] = [createPlan("workspace-initial", "export default function App() { return broken; }")];
  let materializeCount = 0;

  const pipeline: GenerationPipeline = {
    async generateSpec() {
      return candidateSpec;
    },
    async planWorkspace() {
      return plannedWorkspaces[0];
    },
    async materializeWorkspace(plan) {
      materializeCount += 1;
      return createWorkspace(plan);
    },
    async createRuntimeTarget(workspace) {
      return createTarget(workspace);
    },
  };

  const preparationLogs: RuntimeLogEntry[] = [
    {
      id: "log-1",
      timestamp: new Date().toISOString(),
      stream: "stderr",
      message: "src/App.tsx: ReferenceError: broken is not defined",
    },
  ];

  let prepareCount = 0;
  const runner: Runner = {
    async prepare() {
      prepareCount += 1;

      if (prepareCount === 1) {
        throw new Error("Build failed in src/App.tsx");
      }
    },
    async start(target) {
      return createHandle(target);
    },
    async restartDevServer() {},
    async stop() {},
    async getStatus(): Promise<RunnerStatus> {
      return "running";
    },
    async getLogs() {
      return [];
    },
    async getPreparationLogs() {
      return preparationLogs;
    },
  };

  const service = new LocalRuntimeService(runner, new InMemoryRuntimeSessionStore(), pipeline, async (diagnostic) => {
    assert.equal(diagnostic.currentFiles.some((file) => file.path === "src/App.tsx"), true);

    const fixedPlan = createPlan("workspace-fixed", "export default function App() { return <main>Working</main>; }");
    plannedWorkspaces.push(fixedPlan);

    return {
      fixBundle: {
        fixId: "fix-1",
        diagnosticId: diagnostic.diagnosticId,
        reasoningSummary: "Replace the invalid App component with a safe React component.",
        files: [
          {
            path: "src/App.tsx",
            kind: "source",
            content: fixedPlan.files.find((file) => file.path === "src/App.tsx")!.content,
          },
        ],
      },
      provider: {
        name: "test-provider",
        model: "test-model",
      },
      repaired: false,
    };
  });

  const session = await service.startProjectRuntime({
    projectId: "project-1",
    generatedSpec: candidateSpec,
  });

  assert.equal(session.status, "running");
  assert.equal(session.workspaceId, "workspace-initial");
  assert.equal(session.repairAttempts?.length, 1);
  assert.equal(session.repairAttempts?.[0]?.status, "fixed");
  assert.deepEqual(session.repairAttempts?.[0]?.modifiedFiles, ["src/App.tsx"]);
  assert.equal(materializeCount, 2);
});

test("LocalRuntimeService stops the repair loop when the same failure repeats after a fix attempt", async () => {
  const initialPlan = createPlan("workspace-initial", "export default function App() { return broken; }");
  const pipeline: GenerationPipeline = {
    async generateSpec() {
      return candidateSpec;
    },
    async planWorkspace() {
      return initialPlan;
    },
    async materializeWorkspace(plan) {
      return createWorkspace(plan);
    },
    async createRuntimeTarget(workspace) {
      return createTarget(workspace);
    },
  };

  let fixCalls = 0;
  const runner: Runner = {
    async prepare() {
      throw new Error("Build failed in src/App.tsx");
    },
    async start(target) {
      return createHandle(target);
    },
    async restartDevServer() {},
    async stop() {},
    async getStatus(): Promise<RunnerStatus> {
      return "failed";
    },
    async getLogs() {
      return [];
    },
    async getPreparationLogs() {
      return [
        {
          id: "log-1",
          timestamp: new Date().toISOString(),
          stream: "stderr",
          message: "src/App.tsx: ReferenceError: broken is not defined",
        },
      ];
    },
  };

  const service = new LocalRuntimeService(runner, new InMemoryRuntimeSessionStore(), pipeline, async (diagnostic) => {
    fixCalls += 1;

    return {
      fixBundle: {
        fixId: "fix-repeat",
        diagnosticId: diagnostic.diagnosticId,
        reasoningSummary: "Try a bounded rewrite of App.tsx.",
        files: [
          {
            path: "src/App.tsx",
            kind: "source",
            content: "export default function App() { return <main>Still broken</main>; }",
          },
        ],
      },
      provider: {
        name: "test-provider",
      },
      repaired: false,
    };
  });

  const session = await service.startProjectRuntime({
    projectId: "project-1",
    generatedSpec: candidateSpec,
  });

  assert.equal(session.status, "failed");
  assert.equal(fixCalls, 1);
  assert.equal(session.repairAttempts?.length, 2);
  assert.equal(session.repairAttempts?.[0]?.status, "failed");
  assert.equal(session.repairAttempts?.[1]?.status, "aborted");
});

test("LocalRuntimeService captures a browser runtime error and repairs through the same bounded loop", async () => {
  const pipeline: GenerationPipeline = {
    async generateSpec() {
      return candidateSpec;
    },
    async planWorkspace() {
      return createPlan("workspace-browser", "export default function App() { return <main>Broken</main>; }");
    },
    async materializeWorkspace(plan) {
      return createWorkspace(plan);
    },
    async createRuntimeTarget(workspace) {
      return createTarget(workspace);
    },
  };

  let stopCalls = 0;
  const runner: Runner = {
    async prepare() {},
    async start(target) {
      return createHandle(target);
    },
    async restartDevServer() {},
    async stop() {
      stopCalls += 1;
    },
    async getStatus(): Promise<RunnerStatus> {
      return "running";
    },
    async getLogs() {
      return [];
    },
    async getPreparationLogs() {
      return [];
    },
  };

  const service = new LocalRuntimeService(runner, new InMemoryRuntimeSessionStore(), pipeline, async (diagnostic) => {
    assert.match(diagnostic.logExcerpt, /browser/i);
    assert.match(diagnostic.logExcerpt, /cannot read properties of undefined/i);

    return {
      fixBundle: {
        fixId: "fix-browser",
        diagnosticId: diagnostic.diagnosticId,
        reasoningSummary: "Guard the browser render path and replace the broken App component.",
        files: [
          {
            path: "src/App.tsx",
            kind: "source",
            content: "export default function App() { return <main>Recovered browser preview</main>; }",
          },
        ],
      },
      provider: {
        name: "test-provider",
      },
      repaired: false,
    };
  });

  const started = await service.startProjectRuntime({
    projectId: "project-1",
    generatedSpec: candidateSpec,
  });

  const session = await service.reportClientRuntimeError(started.runtimeId, {
    source: "react-error-boundary",
    message: "Cannot read properties of undefined (reading '0')",
    componentStack: "at App (App.tsx:16:40)",
    href: "http://127.0.0.1:3200/",
    timestamp: new Date().toISOString(),
  });

  const logs = await service.getRuntimeLogs(started.runtimeId);

  assert.equal(session.status, "running");
  assert.equal(stopCalls, 1);
  assert.equal(session.repairAttempts?.at(-1)?.status, "fixed");
  assert.equal(logs.entries.some((entry) => entry.stream === "browser"), true);
});

test("LocalRuntimeService hot-updates app-owned files in place without requiring restart", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "appdesigner-hot-update-"));
  const workspaceRoot = path.join(tempRoot, "workspace-live");

  try {
    await mkdir(path.join(workspaceRoot, "src"), { recursive: true });
    await writeFile(path.join(workspaceRoot, "src", "App.tsx"), "export default function App() { return <main>Old</main>; }");
    await writeFile(path.join(workspaceRoot, "src", "styles.css"), "body { color: black; }");
    await writeFile(path.join(workspaceRoot, "src", "project-brief.ts"), "export const projectBrief = {};");

    const initialPlan = createPlan("workspace-live", "export default function App() { return <main>Old</main>; }");
    const updatedPlan = createPlan("workspace-live", "export default function App() { return <main>New</main>; }");
    updatedPlan.files = updatedPlan.files.map((file) =>
      file.path === "src/styles.css" ? { ...file, content: "body { color: blue; }" } : file,
    );

    let planCalls = 0;
    const pipeline: GenerationPipeline = {
      async generateSpec() {
        return candidateSpec;
      },
      async planWorkspace() {
        planCalls += 1;
        return planCalls === 1 ? initialPlan : updatedPlan;
      },
      async materializeWorkspace(plan) {
        return {
          ...createWorkspace(plan),
          absoluteRootPath: workspaceRoot,
        };
      },
      async createRuntimeTarget(workspace) {
        return createTarget(workspace);
      },
    };

    const runner: Runner = {
      async prepare() {},
      async start(target) {
        return createHandle(target);
      },
      async restartDevServer() {},
      async stop() {},
      async getStatus(): Promise<RunnerStatus> {
        return "running";
      },
      async getLogs() {
        return [];
      },
      async getPreparationLogs() {
        return [];
      },
    };

    const service = new LocalRuntimeService(runner, new InMemoryRuntimeSessionStore(), pipeline);
    const started = await service.startProjectRuntime({
      projectId: "project-1",
      generatedSpec: candidateSpec,
    });

    const result = await service.updateProjectRuntime(started.runtimeId, {
      generatedSpec: {
        ...candidateSpec,
        appId: "app-updated",
        metadata: {
          ...candidateSpec.metadata,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    const appContents = await readFile(path.join(workspaceRoot, "src", "App.tsx"), "utf8");
    const styleContents = await readFile(path.join(workspaceRoot, "src", "styles.css"), "utf8");

    assert.equal(result.strategyUsed, "hot-update");
    assert.equal(result.devServerRestarted, false);
    assert.equal(result.fullRuntimeRestartRequired, false);
    assert.equal(result.workspaceChangesApplied, true);
    assert.deepEqual(result.attemptedPaths.sort(), ["src/App.tsx", "src/styles.css"]);
    assert.deepEqual(result.appliedPaths.sort(), ["src/App.tsx", "src/styles.css"]);
    assert.deepEqual(result.updatedPaths.sort(), ["src/App.tsx", "src/styles.css"]);
    assert.equal(result.editChangeSet?.operationPaths.length, 2);
    assert.deepEqual(result.editChangeSet?.rejectedPaths, []);
    assert.deepEqual(result.codeVerification?.landedPaths.sort(), ["src/App.tsx", "src/styles.css"]);
    assert.equal(result.session.runtimeId, started.runtimeId);
    assert.match(appContents, /New/);
    assert.match(styleContents, /blue/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("LocalRuntimeService requests full runtime restart when non-hot-safe runtime shape changes", async () => {
  const initialPlan = createPlan("workspace-live", "export default function App() { return <main>Old</main>; }");
  const updatedPlan = {
    ...createPlan("workspace-live", "export default function App() { return <main>New</main>; }"),
    manifest: {
      ...manifest,
      devCommand: ["npm", "run", "dev"],
    },
  };

  let planCalls = 0;
  const pipeline: GenerationPipeline = {
    async generateSpec() {
      return candidateSpec;
    },
    async planWorkspace() {
      planCalls += 1;
      return planCalls === 1 ? initialPlan : updatedPlan;
    },
    async materializeWorkspace(plan) {
      return createWorkspace(plan);
    },
    async createRuntimeTarget(workspace) {
      return createTarget(workspace);
    },
  };

  const runner: Runner = {
    async prepare() {},
    async start(target) {
      return createHandle(target);
    },
    async restartDevServer() {},
    async stop() {},
    async getStatus(): Promise<RunnerStatus> {
      return "running";
    },
    async getLogs() {
      return [];
    },
    async getPreparationLogs() {
      return [];
    },
  };

  const service = new LocalRuntimeService(runner, new InMemoryRuntimeSessionStore(), pipeline);
  const started = await service.startProjectRuntime({
    projectId: "project-1",
    generatedSpec: candidateSpec,
  });

  const result = await service.updateProjectRuntime(started.runtimeId, {
    generatedSpec: {
      ...candidateSpec,
      appId: "app-updated-2",
      metadata: {
        ...candidateSpec.metadata,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  assert.equal(result.strategyUsed, "full-runtime-restart-required");
  assert.equal(result.devServerRestarted, false);
  assert.equal(result.fullRuntimeRestartRequired, true);
  assert.equal(result.workspaceChangesApplied, false);
  assert.deepEqual(result.attemptedPaths, ["src/App.tsx"]);
  assert.deepEqual(result.appliedPaths, []);
  assert.deepEqual(result.editChangeSet?.operationPaths, ["src/App.tsx"]);
  assert.deepEqual(result.codeVerification?.generatedPaths, ["src/App.tsx"]);
  assert.match(result.reason ?? "", /manifest changed/i);
});

test("LocalRuntimeService restarts the dev server inside the existing container when hot reload is not enough", async () => {
  const initialPlan = withRuntimeControls(createPlan("workspace-live", "export default function App() { return <main>Old</main>; }"));
  const updatedPlan = withRuntimeControls(createPlan("workspace-live", "export default function App() { return <main>New</main>; }"));

  let planCalls = 0;
  let restartCalls = 0;
  let statusChecks = 0;

  const pipeline: GenerationPipeline = {
    async generateSpec() {
      return candidateSpec;
    },
    async planWorkspace() {
      planCalls += 1;
      return planCalls === 1 ? initialPlan : updatedPlan;
    },
    async materializeWorkspace(plan) {
      return createWorkspace(plan);
    },
    async createRuntimeTarget(workspace) {
      return createTarget(workspace);
    },
  };

  const runner: Runner = {
    async prepare() {},
    async start(target) {
      return createHandle(target);
    },
    async restartDevServer() {
      restartCalls += 1;
    },
    async stop() {},
    async getStatus(): Promise<RunnerStatus> {
      statusChecks += 1;
      return statusChecks === 1 ? "running" : "failed";
    },
    async getLogs() {
      return [];
    },
    async getPreparationLogs() {
      return [];
    },
  };

  const service = new LocalRuntimeService(runner, new InMemoryRuntimeSessionStore(), pipeline);
  const started = await service.startProjectRuntime({
    projectId: "project-1",
    generatedSpec: candidateSpec,
  });

  const result = await service.updateProjectRuntime(started.runtimeId, {
    generatedSpec: {
      ...candidateSpec,
      appId: "app-updated-3",
      metadata: {
        ...candidateSpec.metadata,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  assert.equal(result.strategyUsed, "dev-server-restart");
  assert.equal(result.devServerRestarted, true);
  assert.equal(result.fullRuntimeRestartRequired, false);
  assert.equal(result.workspaceChangesApplied, true);
  assert.deepEqual(result.attemptedPaths, ["src/App.tsx"]);
  assert.deepEqual(result.appliedPaths, ["src/App.tsx"]);
  assert.deepEqual(result.editChangeSet?.operationPaths, ["src/App.tsx"]);
  assert.deepEqual(result.codeVerification?.landedPaths, ["src/App.tsx"]);
  assert.equal(restartCalls, 1);
});

test("LocalRuntimeService can restart the dev server through the bounded control method", async () => {
  const initialPlan = withRuntimeControls(createPlan("workspace-live", "export default function App() { return <main>Old</main>; }"));

  const pipeline: GenerationPipeline = {
    async generateSpec() {
      return candidateSpec;
    },
    async planWorkspace() {
      return initialPlan;
    },
    async materializeWorkspace(plan) {
      return createWorkspace(plan);
    },
    async createRuntimeTarget(workspace) {
      return createTarget(workspace);
    },
  };

  let restartCalls = 0;
  const runner: Runner = {
    async prepare() {},
    async start(target) {
      return createHandle(target);
    },
    async restartDevServer() {
      restartCalls += 1;
    },
    async stop() {},
    async getStatus(): Promise<RunnerStatus> {
      return "running";
    },
    async getLogs() {
      return [];
    },
    async getPreparationLogs() {
      return [];
    },
  };

  const service = new LocalRuntimeService(runner, new InMemoryRuntimeSessionStore(), pipeline);
  const started = await service.startProjectRuntime({
    projectId: "project-1",
    generatedSpec: candidateSpec,
  });
  const result = await service.requestDevServerControl(started.runtimeId, "dev-server-restart");

  assert.equal(result.strategyUsed, "dev-server-restart");
  assert.equal(restartCalls, 1);
});

test("LocalRuntimeService applies direct UI edit files even when the app spec itself is unchanged", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "appdesigner-direct-edit-"));
  const workspaceRoot = path.join(tempRoot, "workspace-live");

  try {
    await mkdir(path.join(workspaceRoot, "src", "components"), { recursive: true });
    await writeFile(path.join(workspaceRoot, "src", "App.tsx"), "export default function App() { return <main>Old</main>; }");
    await writeFile(path.join(workspaceRoot, "src", "styles.css"), "body { color: black; }");
    await writeFile(path.join(workspaceRoot, "src", "project-brief.ts"), "export const projectBrief = {};");

    const initialPlan = createPlan("workspace-live", "export default function App() { return <main>Old</main>; }");

    const pipeline: GenerationPipeline = {
      async generateSpec() {
        return candidateSpec;
      },
      async planWorkspace() {
        return initialPlan;
      },
      async materializeWorkspace(plan) {
        return {
          ...createWorkspace(plan),
          absoluteRootPath: workspaceRoot,
        };
      },
      async createRuntimeTarget(workspace) {
        return createTarget(workspace);
      },
    };

    const runner: Runner = {
      async prepare() {},
      async start(target) {
        return createHandle(target);
      },
      async restartDevServer() {},
      async stop() {},
      async getStatus(): Promise<RunnerStatus> {
        return "running";
      },
      async getLogs() {
        return [];
      },
      async getPreparationLogs() {
        return [];
      },
    };

    const service = new LocalRuntimeService(runner, new InMemoryRuntimeSessionStore(), pipeline);
    const started = await service.startProjectRuntime({
      projectId: "project-1",
      generatedSpec: candidateSpec,
    });

    const result = await service.updateProjectRuntime(started.runtimeId, {
      generatedSpec: candidateSpec,
      directEdit: {
        strategy: "direct-ui-source-edit",
        summary: "Add a testimonials section to the homepage.",
        files: [
          {
            path: "src/App.tsx",
            kind: "source",
            content: "import { TestimonialsSection } from './components/TestimonialsSection';\nexport default function App() { return <><main>Old</main><TestimonialsSection /></>; }\n",
          },
          {
            path: "src/components/TestimonialsSection.tsx",
            kind: "source",
            content: "export function TestimonialsSection() { return <section>Happy customers</section>; }\n",
          },
        ],
        notes: ["Adds a testimonials section."],
      },
    });

    assert.equal(result.strategyUsed, "hot-update");
    assert.deepEqual(result.appliedPaths.sort(), ["src/App.tsx", "src/components/TestimonialsSection.tsx"]);
    assert.deepEqual(result.editChangeSet?.operationPaths.sort(), ["src/App.tsx", "src/components/TestimonialsSection.tsx"]);
    assert.deepEqual(result.codeVerification?.landedPaths.sort(), ["src/App.tsx", "src/components/TestimonialsSection.tsx"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
