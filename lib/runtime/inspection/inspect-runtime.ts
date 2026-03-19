import { randomUUID } from "node:crypto";

import { createFailureSignature } from "@/lib/runtime/inspection/failure-signature";
import { extractRelevantLogExcerpt } from "@/lib/runtime/inspection/log-extract";
import type { RuntimeFailure, RuntimeLogEntry } from "@/lib/runtime/logs";
import type { RuntimeSessionRecord } from "@/lib/runtime/store/runtime-session-store";
import type { MaterializedWorkspace } from "@/lib/workspace/model";

export type InspectionArtifact = {
  inspectionId: string;
  runtimeId: string;
  workspaceId: string;
  sourceId: string;
  failureKind: "build" | "startup" | "runtime";
  headline: string;
  logExcerpt: string;
  stackExcerpt: string;
  suspectFiles: string[];
  attemptNumber: number;
  failureSignature: string;
};

export function inspectRuntimeFailure(input: {
  session: RuntimeSessionRecord;
  workspace?: MaterializedWorkspace;
  failure?: RuntimeFailure;
  logs: RuntimeLogEntry[];
  attemptNumber: number;
}): InspectionArtifact {
  const failureKind = classifyFailureKind(input.failure);
  const { excerpt, stackExcerpt } = extractRelevantLogExcerpt(input.logs);
  const headline = input.failure?.message || "Generated app failed during runtime preparation.";
  const suspectFiles = inferSuspectFiles(input.workspace);
  const failureSignature = createFailureSignature({
    failure: input.failure,
    logExcerpt: excerpt || stackExcerpt,
  });

  return {
    inspectionId: randomUUID(),
    runtimeId: input.session.runtimeId,
    workspaceId: input.workspace?.workspaceId ?? input.session.workspaceId,
    sourceId: input.session.sourceSpecId,
    failureKind,
    headline,
    logExcerpt: excerpt,
    stackExcerpt,
    suspectFiles,
    attemptNumber: input.attemptNumber,
    failureSignature,
  };
}

function classifyFailureKind(failure?: RuntimeFailure) {
  switch (failure?.code) {
    case "image_build_failed":
      return "build";
    case "container_start_failed":
    case "port_binding_failed":
      return "startup";
    default:
      return "runtime";
  }
}

function inferSuspectFiles(workspace?: MaterializedWorkspace) {
  if (!workspace) {
    return [];
  }

  return workspace.files
    .filter((file) => /^src\/(App\.tsx|styles\.css|project-brief\.ts|components\/.+\.(ts|tsx))$/.test(file.path))
    .map((file) => file.path);
}
