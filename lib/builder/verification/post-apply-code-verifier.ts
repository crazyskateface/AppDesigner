import type { RuntimeUpdateResult } from "@/lib/runtime/service/dto";

import {
  postApplyCodeVerificationSchema,
  type CodeChangeDiff,
} from "@/lib/builder/verification/schema";
import { extractRequestedCodeEdit } from "@/lib/builder/verification/request-extraction";

function describeDiff(path: string, status: CodeChangeDiff["landingStatus"]) {
  switch (status) {
    case "landed":
      return `Verified landed file change in ${path}.`;
    case "missing":
      return `Expected file change did not land in ${path}.`;
    case "unchanged":
      return `Target file stayed unchanged at ${path}.`;
    case "overwritten":
      return `Generated change for ${path} was overwritten or diverged before verification.`;
  }
}

function matchesRequest(prompt: string, diff: CodeChangeDiff, names: string[]) {
  if (names.some((name) => diff.path.toLowerCase().includes(name.toLowerCase()))) {
    return true;
  }

  if (names.some((name) => (diff.generatedContent ?? "").includes(name) || (diff.finalContent ?? "").includes(name))) {
    return true;
  }

  if (/\bcomponent\b/i.test(prompt)) {
    return /src\/components\//i.test(diff.path) || /function\s+[A-Z]/.test(diff.generatedContent ?? "");
  }

  if (/\bpage\b/i.test(prompt)) {
    return /src\/pages\//i.test(diff.path) || /src\/App\.tsx$/i.test(diff.path);
  }

  if (/\bfile\b/i.test(prompt)) {
    return true;
  }

  return true;
}

export function derivePostApplyCodeVerification(
  userPrompt: string,
  updateResult?: RuntimeUpdateResult | null,
) {
  if (!updateResult?.codeVerification) {
    return null;
  }

  const request = extractRequestedCodeEdit(userPrompt);
  const requestedNames = request.requestedArtifactHints.flatMap((hint) => (hint.name ? [hint.name] : []));
  const relevantDiffs = updateResult.codeVerification.observedDiffs.filter((diff) => matchesRequest(userPrompt, diff, requestedNames));
  const landedDiffs = relevantDiffs.filter((diff) => diff.landingStatus === "landed");
  const droppedDiffs = relevantDiffs.filter((diff) => diff.landingStatus === "missing" || diff.landingStatus === "unchanged" || diff.landingStatus === "overwritten");

  const classification =
    relevantDiffs.length === 0
      ? updateResult.codeVerification.generatedFileDiffs.length === 0
        ? "not_landed"
        : "inconclusive"
      : landedDiffs.length === relevantDiffs.length
        ? "landed"
        : landedDiffs.length > 0
          ? "partial"
          : "not_landed";

  const verifiedLandedEdits = landedDiffs.map((diff) => describeDiff(diff.path, diff.landingStatus));
  const droppedEdits = droppedDiffs.map((diff) => describeDiff(diff.path, diff.landingStatus));
  const inconclusiveEdits =
    classification === "inconclusive" ? ["Could not map the generated file diffs back to the requested edit with enough confidence."] : [];
  const summary =
    classification === "landed"
      ? `Verified landed file change${landedDiffs.length === 1 ? "" : "s"} in ${landedDiffs.map((diff) => diff.path).join(", ")}.`
      : classification === "partial"
        ? "Verified some landed file changes, but part of the attempted update did not persist."
        : classification === "not_landed"
          ? "Could not verify a landed file change for the attempted update in the workspace files."
          : "Could not reliably verify whether the attempted update produced a landed file change in the workspace files.";

  return postApplyCodeVerificationSchema.parse({
    request,
    generated: {
      generatedPaths: updateResult.codeVerification.generatedPaths,
      normalizedPaths: updateResult.codeVerification.generatedFileDiffs.map((diff) => diff.path),
      generatedFileDiffs: updateResult.codeVerification.generatedFileDiffs,
      generatedChangeSummary:
        updateResult.codeVerification.generatedFileDiffs.length > 0
          ? `Prepared ${updateResult.codeVerification.generatedFileDiffs.length} generated file diffs.`
          : "No generated file diffs were available for verification.",
    },
    apply: {
      attemptedPaths: updateResult.attemptedPaths,
      appliedPaths: updateResult.appliedPaths,
      workspaceChangesApplied: updateResult.workspaceChangesApplied,
      runtimeId: updateResult.session.runtimeId,
      workspaceId: updateResult.session.workspaceId,
      applyStrategy: updateResult.strategyUsed,
    },
    final: {
      finalPathsChecked: updateResult.codeVerification.finalPathsChecked,
      observedDiffs: updateResult.codeVerification.observedDiffs,
      missingExpectedDiffs: updateResult.codeVerification.missingPaths,
      overwrittenDiffs: updateResult.codeVerification.overwrittenPaths,
      unchangedDiffs: updateResult.codeVerification.unchangedPaths,
    },
    classification,
    verifiedLandedEdits,
    droppedEdits,
    inconclusiveEdits,
    summary,
  });
}
