import { NextResponse } from "next/server";

import { builderRequestSchema } from "@/lib/domain/app-spec";
import { generateAppSpecFromPrompt } from "@/lib/spec-pipeline/app-spec-generation-orchestrator";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsedRequest = builderRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Please enter a more descriptive prompt about the app you want to build.",
        issues: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await generateAppSpecFromPrompt(parsedRequest.data.prompt, {
      mode: parsedRequest.data.mode,
      currentSpec: parsedRequest.data.currentSpec,
    });
    return NextResponse.json(result);
  } catch (error) {
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
