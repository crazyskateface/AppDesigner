import { NextResponse } from "next/server";
import { z } from "zod";

import { logBackendEvent } from "@/lib/observability/backend-logger";

const telemetryLogSchema = z.object({
  area: z.string().trim().min(1).max(40),
  event: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(500),
  level: z.enum(["info", "warn", "error"]).default("info"),
  projectId: z.string().trim().min(1).max(80).optional().nullable(),
  runtimeId: z.string().trim().min(1).max(80).optional().nullable(),
  error: z.string().trim().min(1).max(1200).optional().nullable(),
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = telemetryLogSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid telemetry event." }, { status: 400 });
  }

  logBackendEvent({
    area: parsed.data.area,
    event: parsed.data.event,
    message: parsed.data.message,
    level: parsed.data.level,
    context: {
      projectId: parsed.data.projectId ?? undefined,
      runtimeId: parsed.data.runtimeId ?? undefined,
      ...(parsed.data.context ?? {}),
    },
    error: parsed.data.error ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
