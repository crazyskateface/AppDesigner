import { NextResponse } from "next/server";

import { logBackendEvent } from "@/lib/observability/backend-logger";
import { startRuntimeInputSchema } from "@/lib/runtime/service/dto";
import { runtimeService } from "@/lib/runtime/service";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsedRequest = startRuntimeInputSchema.safeParse(body);

  if (!parsedRequest.success) {
    logBackendEvent({
      area: "api.runtime.start",
      event: "validation-failed",
      message: "Rejected invalid runtime start request.",
      level: "warn",
    });
    return NextResponse.json(
      {
        error: "Provide a project id and a valid generated app spec.",
        issues: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    logBackendEvent({
      area: "api.runtime.start",
      event: "request-started",
      message: "Starting runtime session.",
      context: {
        projectId: parsedRequest.data.projectId,
        directEdit: Boolean(parsedRequest.data.directEdit),
      },
    });
    const session = await runtimeService.startProjectRuntime(parsedRequest.data);
    logBackendEvent({
      area: "api.runtime.start",
      event: "request-finished",
      message: "Runtime session started.",
      context: {
        projectId: session.projectId,
        runtimeId: session.runtimeId,
        status: session.status,
      },
    });
    return NextResponse.json(session);
  } catch (error) {
    logBackendEvent({
      area: "api.runtime.start",
      event: "request-failed",
      message: "Runtime start failed.",
      level: "error",
      context: {
        projectId: parsedRequest.data.projectId,
      },
      error,
    });
    return NextResponse.json({ error: "Could not start the runtime." }, { status: 500 });
  }
}
