import assert from "node:assert/strict";
import test from "node:test";

import { generateFallbackAppSpec } from "@/lib/domain/app-spec/generate";
import { buildPromptContextEnvelope, formatPromptContextForLlm } from "@/lib/planner/prompt-context";
import { isActionableDecision } from "@/lib/project-memory/summarize";
import {
  createEmptyProjectBuildMemory,
  rememberClarificationAnswers,
  rememberGenerationSuccess,
  rememberPromptSubmission,
  rememberRepairAttemptOutcome,
} from "@/lib/project-memory/update-memory";

test("project memory stores bounded prompt context and prompt-derived constraints", () => {
  const result = rememberPromptSubmission(createEmptyProjectBuildMemory("project-1"), {
    prompt: "Build a CRM for solo consultants. Do not add team workflows or admin bloat.",
    mode: "create",
    timestamp: "2026-03-19T00:00:00.000Z",
  });

  assert.equal(result.memory.recentPrompts.length, 1);
  assert.equal(result.memory.currentDirection.mode, "create");
  assert.match(result.memory.llmContextSummary, /Current direction:/);
  assert.match(result.memory.llmContextSummary, /solo consultants/i);
  assert.equal(result.memory.constraints.some((constraint) => /Do not add team workflows/i.test(constraint.text)), true);
});

test("project memory carries clarifications, outcomes, and repair history into the llm summary", () => {
  const appSpec = generateFallbackAppSpec("Build a booking dashboard for a tattoo studio.");

  let result = rememberClarificationAnswers(createEmptyProjectBuildMemory("project-1"), {
    prompt: "Build a booking app.",
    answers: [
      {
        questionId: "target-user",
        label: "Who is the app for?",
        answer: "A small tattoo studio with two artists.",
      },
    ],
    timestamp: "2026-03-19T00:00:00.000Z",
  });

  result = rememberGenerationSuccess(result.memory, {
    prompt: "Build a booking app for a small tattoo studio.",
    mode: "create",
    appSpec,
    timestamp: "2026-03-19T00:01:00.000Z",
  });

  result = rememberRepairAttemptOutcome(result.memory, {
    attemptId: "repair-1",
    runtimeId: "runtime-1",
    workspaceId: "workspace-1",
    failureKind: "runtime",
    failureSignature: "sig-1",
    status: "fixed",
    startedAt: "2026-03-19T00:02:00.000Z",
    finishedAt: "2026-03-19T00:02:30.000Z",
    logExcerpt: "ReferenceError",
    diagnosticSummary: "Recovered a runtime reference error in the preview.",
    modifiedFiles: ["src/App.tsx"],
    repaired: true,
  });

  assert.match(result.memory.llmContextSummary, /tattoo studio/i);
  assert.match(result.memory.llmContextSummary, /Recent outcomes:/);
  assert.match(result.memory.llmContextSummary, /Recovered a runtime reference error/i);
});

test("prompt context includes project memory summary, decisions, and constraints", () => {
  const memory = rememberClarificationAnswers(createEmptyProjectBuildMemory("project-1"), {
    prompt: "Build a CRM.",
    answers: [
      {
        questionId: "audience",
        label: "Who is this for?",
        answer: "Solo consultants, not teams.",
      },
    ],
    timestamp: "2026-03-19T00:00:00.000Z",
  }).memory;

  const context = buildPromptContextEnvelope({
    prompt: "Add meeting follow-ups.",
    mode: "edit",
    projectMemory: memory,
  });

  const formatted = formatPromptContextForLlm(context);

  assert.match(formatted, /Project memory:/);
  assert.match(formatted, /Active decisions:/);
  assert.match(formatted, /Solo consultants, not teams/i);
});

test("project memory LLM summary excludes stale page titles and archetype", () => {
  const memory = createEmptyProjectBuildMemory("project-1");

  // Simulate storing page titles and archetype like the old AppSpec flow would
  memory.projectState.appTitle = "Booking Dashboard";
  memory.projectState.archetype = "booking";
  memory.projectState.pageTitles = ["Overview", "Appointments", "Clients", "Settings"];

  const result = rememberPromptSubmission(memory, {
    prompt: "Change the landing page layout.",
    mode: "edit",
    timestamp: "2026-03-19T00:00:00.000Z",
  });

  const summary = result.memory.llmContextSummary;

  // appTitle should still be present (useful context)
  assert.match(summary, /Booking Dashboard/);

  // pageTitles should NOT appear in the LLM summary
  assert.doesNotMatch(summary, /Overview/);
  assert.doesNotMatch(summary, /Appointments/);
  assert.doesNotMatch(summary, /Clients/);
  assert.doesNotMatch(summary, /Settings/);
  assert.doesNotMatch(summary, /archetype/i);
});

test("isActionableDecision excludes stale verified-landed and verified-page decisions", () => {
  assert.equal(isActionableDecision("Verified landed file change in src/App.tsx."), false);
  assert.equal(isActionableDecision("Verified page present: Dashboard."), false);
  assert.equal(isActionableDecision("Verified landed file change in src/components/Sidebar.tsx."), false);
  assert.equal(isActionableDecision("Use minimal navigation for the app shell."), true);
  assert.equal(isActionableDecision("User prefers dark mode as default."), true);
});

test("buildProjectMemoryLlmSummary excludes stale verified decisions", () => {
  const memory = createEmptyProjectBuildMemory("project-1");

  memory.decisions = [
    { id: "d1", summary: "Verified landed file change in src/App.tsx.", source: "generation", createdAt: "2026-03-19T00:00:00.000Z" },
    { id: "d2", summary: "Verified page present: Overview.", source: "generation", createdAt: "2026-03-19T00:00:01.000Z" },
    { id: "d3", summary: "Use card-based layout for the dashboard.", source: "generation", createdAt: "2026-03-19T00:00:02.000Z" },
  ];

  const result = rememberPromptSubmission(memory, {
    prompt: "Change the header color.",
    mode: "edit",
    timestamp: "2026-03-19T00:01:00.000Z",
  });

  const summary = result.memory.llmContextSummary;

  assert.doesNotMatch(summary, /Verified landed/i);
  assert.doesNotMatch(summary, /Verified page present/i);
  assert.match(summary, /card-based layout/);
});

test("buildPromptContextEnvelope excludes stale verified decisions from activeDecisions", () => {
  const memory = createEmptyProjectBuildMemory("project-1");

  memory.decisions = [
    { id: "d1", summary: "Verified landed file change in src/App.tsx.", source: "generation", createdAt: "2026-03-19T00:00:00.000Z" },
    { id: "d2", summary: "Verified page present: Clients.", source: "generation", createdAt: "2026-03-19T00:00:01.000Z" },
    { id: "d3", summary: "Prefer tabbed navigation.", source: "generation", createdAt: "2026-03-19T00:00:02.000Z" },
  ];

  const result = rememberPromptSubmission(memory, {
    prompt: "Simplify the nav.",
    mode: "edit",
    timestamp: "2026-03-19T00:01:00.000Z",
  });

  const context = buildPromptContextEnvelope({
    prompt: "Simplify the nav.",
    mode: "edit",
    projectMemory: result.memory,
  });

  assert.ok(!context.activeDecisions.some((d) => /Verified landed/i.test(d)));
  assert.ok(!context.activeDecisions.some((d) => /Verified page present/i.test(d)));
  assert.ok(context.activeDecisions.some((d) => /tabbed navigation/i.test(d)));
});
