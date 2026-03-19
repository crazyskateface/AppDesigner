import { NextResponse } from "next/server";

import { logBackendEvent } from "@/lib/observability/backend-logger";
import { runtimeService } from "@/lib/runtime/service";
import { browserRuntimeErrorReportSchema } from "@/lib/runtime/service/dto";
import { RuntimeServiceNotFoundError } from "@/lib/runtime/service/runtime-service";

export async function POST(request: Request, context: { params: Promise<{ runtimeId: string }> }) {
  const { runtimeId } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = browserRuntimeErrorReportSchema.safeParse(body);

  if (!parsed.success) {
    logBackendEvent({
      area: "api.runtime.client-error",
      event: "validation-failed",
      message: "Rejected invalid browser runtime error payload.",
      level: "warn",
      context: { runtimeId },
    });
    return NextResponse.json(
      {
        error: "Provide a valid browser runtime error payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    logBackendEvent({
      area: "api.runtime.client-error",
      event: "reported",
      message: parsed.data.message,
      level: "error",
      context: {
        runtimeId,
        source: parsed.data.source,
      },
    });
    const snapshot = await runtimeService.reportClientRuntimeError(runtimeId, parsed.data);
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof RuntimeServiceNotFoundError) {
      logBackendEvent({
        area: "api.runtime.client-error",
        event: "runtime-missing",
        message: "Browser runtime error targeted a missing session.",
        level: "warn",
        context: { runtimeId },
      });
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    logBackendEvent({
      area: "api.runtime.client-error",
      event: "report-failed",
      message: "Could not process browser runtime error.",
      level: "error",
      context: { runtimeId },
      error,
    });
    return NextResponse.json({ error: "Could not process browser runtime error." }, { status: 500 });
  }
}
