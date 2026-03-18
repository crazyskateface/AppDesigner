import { NextResponse } from "next/server";

import { generateAppSpec, appSpecSchema, builderRequestSchema } from "@/lib/domain/app-spec";

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

  const appSpec = generateAppSpec(parsedRequest.data.prompt);
  const parsedSpec = appSpecSchema.safeParse(appSpec);

  if (!parsedSpec.success) {
    return NextResponse.json(
      {
        error: "The local generator produced an invalid app spec.",
        issues: parsedSpec.error.flatten(),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ appSpec: parsedSpec.data });
}
