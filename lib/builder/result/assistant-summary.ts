import type { GroundedBuildResult } from "@/lib/builder/result/schema";

function joinQuoted(items: string[]) {
  if (items.length === 0) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function buildGroundedAssistantSummary(result: Omit<GroundedBuildResult, "assistant" | "memory">) {
  const title = result.attempt.nextSpec?.title ?? "the app";
  const verified = result.applied.verifiedRequestedChanges;
  const unverified = result.applied.unverifiedRequestedChanges;
  const verification = result.verification;
  const strategyNote =
    result.runtime.strategyUsed === "dev-server-restart"
      ? " I had to restart the dev server inside the existing container."
      : result.runtime.strategyUsed === "hot-update"
        ? " The live runtime stayed up and hot reloaded."
        : "";

  switch (result.classification) {
    case "verified_success": {
      if (verification?.classification === "landed") {
        return {
          tone: "success" as const,
          message: `${verification.summary}${strategyNote}`.trim(),
        };
      }

      const verifiedSummary =
        verified.length > 0
          ? `I applied and verified ${joinQuoted(verified)} in ${title}.`
          : `I applied and verified the structural update in ${title}.`;

      return {
        tone: "success" as const,
        message: `${verifiedSummary}${strategyNote}`.trim(),
      };
    }
    case "partial_success": {
      if (verification?.classification === "partial" || verification?.classification === "inconclusive") {
        const missingSummary =
          verification.droppedEdits.length > 0
            ? ` ${verification.droppedEdits.slice(0, 2).join(" ")}`
            : verification.inconclusiveEdits.length > 0
              ? ` ${verification.inconclusiveEdits[0]}`
              : "";

        return {
          tone: "warning" as const,
          message: `${verification.summary}${missingSummary}${strategyNote}`.trim(),
        };
      }

      // Direct-ui-source-edit: files landed but visual fulfillment not confirmed.
      if (verification?.classification === "landed") {
        const pathCount = verification.verifiedLandedEdits.length;
        return {
          tone: "success" as const,
          message: `I applied the source ${pathCount === 1 ? "change" : "changes"} and the ${pathCount === 1 ? "file" : "files"} landed in the workspace.${strategyNote} I have not verified that the visual result matches your request.`,
        };
      }

      // Create-mode honest partial success: runtime started but no file-level verification.
      if (result.mode === "create" && result.runtime.healthy && result.stages.verification.status === "partial") {
        return {
          tone: "success" as const,
          message: `I created ${title} and the runtime started successfully.`,
        };
      }

      const verifiedSummary =
        verified.length > 0 ? `I verified ${joinQuoted(verified)} in ${title}.` : `I applied part of the update to ${title}.`;
      const missingSummary =
        unverified.length > 0
          ? ` I could not verify ${joinQuoted(unverified)} yet.`
          : result.runtime.healthy
            ? ""
            : " I could not fully verify the requested result.";
      const runtimeSummary =
        result.runtime.healthy || !result.runtime.diagnosticSummary
          ? ""
          : ` The preview still has a runtime issue: ${result.runtime.diagnosticSummary}`;

      return {
        tone: "warning" as const,
        message: `${verifiedSummary}${missingSummary}${runtimeSummary}`.trim(),
      };
    }
    case "no_effect":
      return {
        tone: "warning" as const,
        message:
          verification?.classification === "not_landed"
            ? verification.summary
            : result.applied.unverifiedRequestedChanges.length > 0
            ? `I could not verify a supported structural change for ${joinQuoted(result.applied.unverifiedRequestedChanges)}, so ${title} was left unchanged.`
            : `I could not verify a meaningful supported change from that prompt, so ${title} was left unchanged.`,
      };
    case "apply_failed":
      return {
        tone: "error" as const,
        message: `I could not apply that update to the workspace for ${title}. ${result.runtime.reason ?? "The requested change was not verified."}`,
      };
    case "runtime_failed": {
      const workspaceSummary = result.applied.changed
        ? `I updated the workspace for ${title}`
        : `I attempted the update for ${title}`;
      const runtimeSummary = result.runtime.diagnosticSummary ?? result.runtime.reason ?? "the preview did not recover cleanly";

      return {
        tone: "error" as const,
        message: `${workspaceSummary}, but ${runtimeSummary}. I am not claiming the requested change is fully applied.`,
      };
    }
  }
}
