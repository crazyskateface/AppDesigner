import { NextResponse } from "next/server";

import { builderGenerateRequestSchema } from "@/lib/builder/generation/contract";
import { resolveBuilderGenerateRequest } from "@/lib/builder/generation/resolve-request";
import { logBackendEvent } from "@/lib/observability/backend-logger";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsedRequest = builderGenerateRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    logBackendEvent({
      area: "api.generate",
      event: "validation-failed",
      message: "Rejected invalid generate request.",
      level: "warn",
    });
    return NextResponse.json(
      {
        error: "Please enter a more descriptive prompt about the app you want to build.",
        issues: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    logBackendEvent({
      area: "api.generate",
      event: "request-started",
      message: "Resolving builder generate request.",
      context: {
        mode: parsedRequest.data.mode,
        hasRuntimeId: Boolean(parsedRequest.data.runtimeId),
        promptLength: parsedRequest.data.prompt.length,
      },
    });
    const result = await resolveBuilderGenerateRequest(parsedRequest.data);
    logBackendEvent({
      area: "api.generate",
      event: "request-finished",
      message: "Builder generate request resolved.",
      context: {
        mode: parsedRequest.data.mode,
        status: result.status,
        changeStatus: result.status === "generation_ready" ? result.changeStatus : undefined,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    logBackendEvent({
      area: "api.generate",
      event: "request-failed",
      message: "Builder generate request failed.",
      level: "error",
      context: {
        mode: parsedRequest.data.mode,
      },
      error,
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : parsedRequest.data.mode === "edit"
              ? "The app update could not be applied."
              : "The server could not generate a valid app spec.",
      },
      { status: 500 },
    );
  }
}
