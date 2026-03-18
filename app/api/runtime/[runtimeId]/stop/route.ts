import { NextResponse } from "next/server";

import { RuntimeServiceNotFoundError } from "@/lib/runtime/service/runtime-service";
import { runtimeService } from "@/lib/runtime/service";

export async function POST(_: Request, context: { params: Promise<{ runtimeId: string }> }) {
  const { runtimeId } = await context.params;

  try {
    const snapshot = await runtimeService.stopProjectRuntime(runtimeId);
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof RuntimeServiceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: "Could not stop runtime." }, { status: 500 });
  }
}
