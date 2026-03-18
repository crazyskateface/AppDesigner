import { NextResponse } from "next/server";

import { RuntimeServiceNotFoundError } from "@/lib/runtime/service/runtime-service";
import { runtimeService } from "@/lib/runtime/service";

export async function GET(_: Request, context: { params: Promise<{ runtimeId: string }> }) {
  const { runtimeId } = await context.params;

  try {
    const logs = await runtimeService.getRuntimeLogs(runtimeId);
    return NextResponse.json(logs);
  } catch (error) {
    if (error instanceof RuntimeServiceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: "Could not load runtime logs." }, { status: 500 });
  }
}
