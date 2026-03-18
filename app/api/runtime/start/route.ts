import { NextResponse } from "next/server";

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
    return NextResponse.json(
      {
        error: "Provide a project id and a valid generated app spec.",
        issues: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  const session = await runtimeService.startProjectRuntime(parsedRequest.data);
  return NextResponse.json(session);
}
