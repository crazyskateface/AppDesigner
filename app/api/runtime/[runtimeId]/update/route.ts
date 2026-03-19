import { NextResponse } from "next/server";

import { logBackendEvent } from "@/lib/observability/backend-logger";
import { runtimeService } from "@/lib/runtime/service";
import { updateRuntimeInputSchema } from "@/lib/runtime/service/dto";
import { RuntimeServiceNotFoundError } from "@/lib/runtime/service/runtime-service";

export async function POST(request: Request, context: { params: Promise<{ runtimeId: string }> }) {
  const { runtimeId } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsedRequest = updateRuntimeInputSchema.safeParse(body);

  if (!parsedRequest.success) {
    logBackendEvent({
      area: "api.runtime.update",
      event: "validation-failed",
      message: "Rejected invalid runtime update request.",
      level: "warn",
      context: { runtimeId },
    });
    return NextResponse.json(
      {
        error: "Provide a valid generated app spec for runtime update.",
        issues: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    logBackendEvent({
      area: "api.runtime.update",
      event: "request-started",
      message: "Updating runtime session.",
      context: {
        runtimeId,
        directEdit: Boolean(parsedRequest.data.directEdit),
      },
    });
    const result = await runtimeService.updateProjectRuntime(runtimeId, parsedRequest.data);
    logBackendEvent({
      area: "api.runtime.update",
      event: "request-finished",
      message: "Runtime update completed.",
      context: {
        runtimeId,
        strategy: result.strategyUsed,
        workspaceChangesApplied: result.workspaceChangesApplied,
        fullRestartRequired: result.fullRuntimeRestartRequired,
        appliedPathCount: result.appliedPaths.length,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RuntimeServiceNotFoundError) {
      logBackendEvent({
        area: "api.runtime.update",
        event: "runtime-missing",
        message: "Runtime update targeted a missing session.",
        level: "warn",
        context: { runtimeId },
      });
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    logBackendEvent({
      area: "api.runtime.update",
      event: "request-failed",
      message: "Runtime update failed.",
      level: "error",
      context: { runtimeId },
      error,
    });
    return NextResponse.json({ error: "Could not update the runtime." }, { status: 500 });
  }
}
