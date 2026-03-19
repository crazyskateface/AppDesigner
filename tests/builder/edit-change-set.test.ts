import assert from "node:assert/strict";
import test from "node:test";

import { applyWorkspaceEditChangeSet } from "@/lib/builder/edits/apply-change-set";
import { deriveWorkspaceEditChangeSet } from "@/lib/builder/edits/derive-change-set";
import { hashWorkspaceContent } from "@/lib/builder/edits/content-hash";
import { validateWorkspaceEditChangeSet } from "@/lib/builder/edits/validate-change-set";
import type { WorkspacePlan } from "@/lib/workspace/model";

function createPlan(files: WorkspacePlan["files"]): WorkspacePlan {
  return {
    projectId: "project-1",
    workspaceId: "workspace-1",
    sourceSpecId: "app-1",
    targetKind: "vite-react-static",
    title: "Test App",
    relativeRootPath: ".generated-workspaces/project-1/workspace-1",
    manifest: {
      packageManager: "npm",
      installCommand: ["npm", "install"],
      devCommand: ["npm", "run", "dev"],
      buildCommand: ["npm", "run", "build"],
      containerPort: 3000,
      dockerfilePath: "Dockerfile",
    },
    files,
  };
}

test("deriveWorkspaceEditChangeSet emits explicit create and replace operations", () => {
  const currentPlan = createPlan([
    { path: "src/App.tsx", kind: "source", content: "export default function App() { return <main>Old</main>; }\n" },
    { path: "src/styles.css", kind: "source", content: "body { color: black; }\n" },
    { path: "src/app-meta.ts", kind: "source", content: "export const appMeta = { name: 'Test', tagline: '', createdFrom: '' };\n" },
  ]);
  const nextPlan = createPlan([
    { path: "src/App.tsx", kind: "source", content: "export default function App() { return <main>New</main>; }\n" },
    { path: "src/styles.css", kind: "source", content: "body { color: black; }\n" },
    { path: "src/app-meta.ts", kind: "source", content: "export const appMeta = { name: 'Test', tagline: '', createdFrom: '' };\n" },
    { path: "src/components/ExtraPanel.tsx", kind: "source", content: "export function ExtraPanel() { return <section>Extra</section>; }\n" },
  ]);

  const changeSet = deriveWorkspaceEditChangeSet(currentPlan, nextPlan, "runtime-1");

  assert.deepEqual(
    changeSet.operations.map((operation) => ({ path: operation.path, type: operation.type })),
    [
      { path: "src/App.tsx", type: "replace-file" },
      { path: "src/components/ExtraPanel.tsx", type: "create-file" },
    ],
  );
});

test("validateWorkspaceEditChangeSet rejects stale previous content hashes", () => {
  const currentFiles = [
    { path: "src/App.tsx", kind: "source" as const, content: "export default function App() { return <main>Current</main>; }\n" },
  ];

  const validation = validateWorkspaceEditChangeSet(currentFiles, {
    changeSetId: "changeset-1",
    projectId: "project-1",
    workspaceId: "workspace-1",
    runtimeId: "runtime-1",
    mode: "edit",
    summary: "Replace App.tsx",
    source: "plan-diff",
    repairNotes: [],
    operations: [
      {
        id: "edit-app",
        type: "replace-file",
        path: "src/App.tsx",
        kind: "source",
        expectedExistingState: "must-exist",
        previousContentHash: hashWorkspaceContent("export default function App() { return <main>Old</main>; }\n"),
        nextContent: "export default function App() { return <main>New</main>; }\n",
        reason: "Replace App.tsx",
      },
    ],
  });

  assert.equal(validation.valid, false);
  assert.match(validation.issues[0] ?? "", /expected previous content hash/i);
});

test("applyWorkspaceEditChangeSet returns deterministic updates and hashes", () => {
  const currentFiles = [
    { path: "src/App.tsx", kind: "source" as const, content: "export default function App() { return <main>Old</main>; }\n" },
  ];

  const result = applyWorkspaceEditChangeSet(currentFiles, {
    changeSetId: "changeset-1",
    projectId: "project-1",
    workspaceId: "workspace-1",
    runtimeId: "runtime-1",
    mode: "edit",
    summary: "Replace App.tsx",
    source: "plan-diff",
    repairNotes: [],
    operations: [
      {
        id: "edit-app",
        type: "replace-file",
        path: "src/App.tsx",
        kind: "source",
        expectedExistingState: "must-exist",
        previousContentHash: hashWorkspaceContent(currentFiles[0].content),
        nextContent: "export default function App() { return <main>New</main>; }\n",
        reason: "Replace App.tsx",
      },
    ],
  });

  assert.deepEqual(result.changedPaths, ["src/App.tsx"]);
  assert.equal(result.updates[0]?.action, "upsert");
  assert.notEqual(result.beforeHashes["src/App.tsx"], result.afterHashes["src/App.tsx"]);
});

test("deriveWorkspaceEditChangeSet records identical-content skipped files", () => {
  const currentPlan = createPlan([
    { path: "src/App.tsx", kind: "source", content: "export default function App() { return <main>Same</main>; }\n" },
    { path: "src/styles.css", kind: "source", content: "body { color: black; }\n" },
  ]);
  const nextPlan = createPlan([
    { path: "src/App.tsx", kind: "source", content: "export default function App() { return <main>Same</main>; }\n" },
    { path: "src/styles.css", kind: "source", content: "body { color: black; }\n" },
  ]);

  const changeSet = deriveWorkspaceEditChangeSet(currentPlan, nextPlan, "runtime-1");

  assert.equal(changeSet.operations.length, 0);
  assert.equal(changeSet.skippedFiles.length, 2);
  assert.deepEqual(
    changeSet.skippedFiles.map((s) => ({ path: s.path, reason: s.reason })),
    [
      { path: "src/App.tsx", reason: "identical-content" },
      { path: "src/styles.css", reason: "identical-content" },
    ],
  );
  assert.match(changeSet.summary, /skipped/i);
});

test("deriveWorkspaceEditChangeSet records path-not-allowed skipped files", () => {
  const currentPlan = createPlan([
    { path: "src/App.tsx", kind: "source", content: "export default function App() { return <main>Old</main>; }\n" },
    { path: "package.json", kind: "source", content: '{ "name": "app" }\n' },
  ]);
  const nextPlan = createPlan([
    { path: "src/App.tsx", kind: "source", content: "export default function App() { return <main>New</main>; }\n" },
    { path: "package.json", kind: "source", content: '{ "name": "app", "version": "2.0" }\n' },
  ]);

  const changeSet = deriveWorkspaceEditChangeSet(currentPlan, nextPlan, "runtime-1");

  assert.equal(changeSet.operations.length, 1);
  assert.equal(changeSet.operations[0].path, "src/App.tsx");
  assert.equal(changeSet.skippedFiles.length, 1);
  assert.deepEqual(changeSet.skippedFiles[0], { path: "package.json", reason: "path-not-allowed" });
});
