import { NextResponse } from "next/server";

import { logProjectMemoryMutation } from "@/lib/project-memory/debug-log";
import { projectMemoryLogRequestSchema } from "@/lib/project-memory/schema";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsedRequest = projectMemoryLogRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Provide a valid project memory mutation payload.",
        issues: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  logProjectMemoryMutation(
    parsedRequest.data.projectId,
    parsedRequest.data.changes,
    parsedRequest.data.memory,
  );

  return NextResponse.json({ ok: true });
}
