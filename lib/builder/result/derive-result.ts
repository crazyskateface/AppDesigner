import type { AppSpec, AppSpecGenerationMeta, PageType, SectionType } from "@/lib/domain/app-spec";
import type { RuntimeSession, RuntimeUpdateResult } from "@/lib/runtime/service/dto";

import { buildGroundedAssistantSummary } from "@/lib/builder/result/assistant-summary";
import { groundedBuildResultSchema, type GroundedBuildResult } from "@/lib/builder/result/schema";
import { derivePostApplyCodeVerification } from "@/lib/builder/verification/post-apply-code-verifier";

type DeriveGroundedBuildResultInput = {
  projectId?: string | null;
  mode: "create" | "edit";
  userPrompt: string;
  generationMeta: AppSpecGenerationMeta;
  previousSpec?: AppSpec | null;
  nextSpec: AppSpec;
  updateResult?: RuntimeUpdateResult | null;
  restartedRuntimeSession?: RuntimeSession | null;
  restartReason?: string | null;
  noOpReason?: string | null;
  applyErrorMessage?: string | null;
};

const supportedSectionRequests: Array<{ type: SectionType; patterns: RegExp[] }> = [
  { type: "stats", patterns: [/\bstats?\b/i, /\bkpi\b/i, /\bmetrics?\b/i] },
  { type: "table", patterns: [/\btable\b/i, /\bgrid\b/i] },
  { type: "list", patterns: [/\blist\b/i] },
  { type: "activity", patterns: [/\bactivity\b/i, /\bfeed\b/i, /\btimeline\b/i] },
  { type: "form", patterns: [/\bform\b/i] },
];

const supportedPageRequests: Array<{ type: PageType; patterns: RegExp[] }> = [
  { type: "dashboard", patterns: [/\bdashboard page\b/i, /\boverview page\b/i] },
  { type: "list", patterns: [/\blist page\b/i, /\brecords page\b/i] },
  { type: "calendar", patterns: [/\bcalendar page\b/i, /\bbooking page\b/i, /\bschedule page\b/i] },
  { type: "settings", patterns: [/\bsettings page\b/i] },
];

const unsupportedFeatureRequests = [
  { label: "video sections", pattern: /\bvideo\b/i },
  { label: "text sections", pattern: /\bsection with text\b|\btext section\b|\brich text\b|\bcontent block\b|\bcopy block\b/i },
];

function serialize(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function createTurnId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `build-result-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function areAppSpecsEquivalent(left: AppSpec | null | undefined, right: AppSpec | null | undefined) {
  if (!left || !right) {
    return false;
  }

  return serialize(left) === serialize(right);
}

function countValues<T extends string>(items: readonly T[]) {
  const counts = new Map<T, number>();

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return counts;
}

function diffAddedValues<T extends string>(previousItems: readonly T[], nextItems: readonly T[]) {
  const previousCounts = countValues(previousItems);
  const nextCounts = countValues(nextItems);
  const added: T[] = [];

  for (const [item, nextCount] of nextCounts.entries()) {
    const previousCount = previousCounts.get(item) ?? 0;

    for (let index = previousCount; index < nextCount; index += 1) {
      added.push(item);
    }
  }

  return added;
}

function extractRequestedSectionTypes(prompt: string) {
  return supportedSectionRequests
    .filter(({ patterns }) => patterns.some((pattern) => pattern.test(prompt)))
    .map(({ type }) => type);
}

function extractRequestedPageTypes(prompt: string) {
  return supportedPageRequests
    .filter(({ patterns }) => patterns.some((pattern) => pattern.test(prompt)))
    .map(({ type }) => type);
}

function extractRequestedUnsupportedFeatures(prompt: string) {
  return unsupportedFeatureRequests.filter(({ pattern }) => pattern.test(prompt)).map(({ label }) => label);
}

function summarizeRequestedChange(mode: "create" | "edit", nextSpec: AppSpec) {
  return mode === "create" ? `Create ${nextSpec.title}.` : `Edit ${nextSpec.title}.`;
}

function summarizeAttempt(mode: "create" | "edit", nextSpec: AppSpec) {
  return mode === "create"
    ? `Generated a new app shell for ${nextSpec.title}.`
    : `Generated an updated app shell for ${nextSpec.title}.`;
}

export function deriveGroundedBuildResult(input: DeriveGroundedBuildResultInput): GroundedBuildResult {
  const previousSectionTypes = input.previousSpec?.pages.flatMap((page) => page.sections.map((section) => section.type)) ?? [];
  const nextSectionTypes = input.nextSpec.pages.flatMap((page) => page.sections.map((section) => section.type));
  const previousPageTypes = input.previousSpec?.pages.map((page) => page.pageType) ?? [];
  const nextPageTypes = input.nextSpec.pages.map((page) => page.pageType);
  const previousPageTitles = new Set(input.previousSpec?.pages.map((page) => page.title) ?? []);
  const addedSectionTypes = diffAddedValues(previousSectionTypes, nextSectionTypes);
  const addedPageTypes = diffAddedValues(previousPageTypes, nextPageTypes);
  const addedPageTitles = input.nextSpec.pages
    .map((page) => page.title)
    .filter((title) => !previousPageTitles.has(title));
  const requestedSectionTypes = extractRequestedSectionTypes(input.userPrompt);
  const requestedPageTypes = extractRequestedPageTypes(input.userPrompt);
  const requestedUnsupportedFeatures = extractRequestedUnsupportedFeatures(input.userPrompt);
  const appSpecChanged = input.mode === "create" ? true : !areAppSpecsEquivalent(input.previousSpec, input.nextSpec);
  const attemptedPaths = input.updateResult?.attemptedPaths ?? [];
  const appliedPaths = input.updateResult?.appliedPaths ?? [];
  const workspaceChanged = input.updateResult?.workspaceChangesApplied ?? input.mode === "create";
  const verifiedRequestedChanges = [
    ...requestedSectionTypes.filter((type) => addedSectionTypes.includes(type)).map((type) => `${type} section`),
    ...requestedPageTypes.filter((type) => addedPageTypes.includes(type)).map((type) => `${type} page`),
  ];
  const unverifiedRequestedChanges = [
    ...requestedSectionTypes.filter((type) => !addedSectionTypes.includes(type)).map((type) => `${type} section`),
    ...requestedPageTypes.filter((type) => !addedPageTypes.includes(type)).map((type) => `${type} page`),
    ...requestedUnsupportedFeatures,
  ];

  const runtimeStatus =
    input.applyErrorMessage
      ? "failed"
      : input.restartedRuntimeSession
        ? input.restartedRuntimeSession.status === "running"
          ? "running"
          : "failed"
        : input.updateResult?.fullRuntimeRestartRequired
          ? "restart-required"
          : input.updateResult
            ? input.updateResult.session.status === "running" || input.updateResult.session.status === "starting"
              ? "running"
              : "failed"
            : input.mode === "create"
              ? "failed"
              : "skipped";

  const runtimeStrategyUsed =
    input.applyErrorMessage
      ? "none"
      : input.restartedRuntimeSession
        ? input.mode === "create"
          ? "full-runtime-start"
          : "full-runtime-restart"
        : (input.updateResult?.strategyUsed ?? "none");

  const runtimeHealthy = runtimeStatus === "running" || runtimeStatus === "skipped";
  const runtimeReason =
    input.applyErrorMessage ??
    input.updateResult?.reason ??
    input.restartReason ??
    input.restartedRuntimeSession?.failure?.message ??
    null;
  const runtimeDiagnosticSummary = input.restartedRuntimeSession?.failure?.message ?? input.updateResult?.session.failure?.message ?? null;
  const verification = input.mode === "edit" ? derivePostApplyCodeVerification(input.userPrompt, input.updateResult) : null;

  let classification: GroundedBuildResult["classification"];

  if (input.applyErrorMessage) {
    classification = "apply_failed";
  } else if (verification?.classification === "landed") {
    classification = "verified_success";
  } else if (verification?.classification === "partial" || verification?.classification === "inconclusive") {
    classification = "partial_success";
  } else if (verification?.classification === "not_landed") {
    classification = "no_effect";
  } else if (input.noOpReason || (!appSpecChanged && !workspaceChanged && appliedPaths.length === 0 && input.mode === "edit")) {
    classification = "no_effect";
  } else if (!runtimeHealthy) {
    classification = workspaceChanged || appSpecChanged ? "partial_success" : "runtime_failed";
  } else if (input.mode === "create") {
    classification = "verified_success";
  } else if (verifiedRequestedChanges.length > 0 && unverifiedRequestedChanges.length === 0) {
    classification = "verified_success";
  } else if (workspaceChanged || appSpecChanged || appliedPaths.length > 0) {
    classification = unverifiedRequestedChanges.length > 0 ? "partial_success" : "verified_success";
  } else {
    classification = "no_effect";
  }

  const baseResult = {
    turnId: createTurnId(),
    projectId: input.projectId ?? null,
    mode: input.mode,
    userPrompt: input.userPrompt,
    request: {
      summary: summarizeRequestedChange(input.mode, input.nextSpec),
      requestedSectionTypes,
      requestedPageTypes,
      requestedUnsupportedFeatures,
    },
    attempt: {
      summary: summarizeAttempt(input.mode, input.nextSpec),
      attemptedPaths,
      appSpecChanged,
      generationMeta: input.generationMeta,
      nextSpec: input.nextSpec,
    },
    applied: {
      changed: workspaceChanged || appSpecChanged || appliedPaths.length > 0,
      appliedPaths,
      appSpecChanged,
      addedSectionTypes,
      addedPageTypes,
      addedPageTitles,
      verifiedRequestedChanges:
        verification?.verifiedLandedEdits.length ? verification.verifiedLandedEdits : verifiedRequestedChanges,
      unverifiedRequestedChanges:
        verification && (verification.droppedEdits.length > 0 || verification.inconclusiveEdits.length > 0)
          ? [...verification.droppedEdits, ...verification.inconclusiveEdits]
          : unverifiedRequestedChanges,
    },
    runtime: {
      status: runtimeStatus,
      strategyUsed: runtimeStrategyUsed,
      devServerRestarted: input.updateResult?.devServerRestarted ?? false,
      fullRuntimeRestartRequired: input.updateResult?.fullRuntimeRestartRequired ?? false,
      healthy: runtimeHealthy,
      reason: input.noOpReason ?? runtimeReason,
      diagnosticSummary: runtimeDiagnosticSummary,
    },
    verification,
    classification,
  } as const;

  const assistant = buildGroundedAssistantSummary(baseResult);
  const durableFacts = classification === "verified_success" || classification === "partial_success"
    ? [
        ...(verification?.verifiedLandedEdits.length
          ? verification.verifiedLandedEdits
          : verifiedRequestedChanges.map((item) => `Verified ${item} in ${input.nextSpec.title}.`)),
        ...addedPageTitles.slice(0, 3).map((title) => `Verified page present: ${title}.`),
      ]
    : [];
  const outcomeSummary =
    classification === "verified_success"
      ? assistant.message
      : classification === "partial_success"
        ? assistant.message
        : classification === "no_effect"
          ? assistant.message
          : classification === "apply_failed"
            ? `Apply failed: ${assistant.message}`
            : `Runtime failed: ${assistant.message}`;

  return groundedBuildResultSchema.parse({
    ...baseResult,
    assistant,
    memory: {
      outcomeSummary,
      durableFacts,
      updateProjectState:
        input.mode === "create"
          ? classification === "verified_success"
          : verification
            ? verification.classification === "landed"
            : classification === "verified_success" || classification === "partial_success",
    },
  });
}
