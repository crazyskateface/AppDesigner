"use client";

type PrimitiveContextValue = string | number | boolean | null | undefined;

export async function logClientEvent(input: {
  area: string;
  event: string;
  message: string;
  level?: "info" | "warn" | "error";
  projectId?: string | null;
  runtimeId?: string | null;
  context?: Record<string, PrimitiveContextValue>;
  error?: string | null;
}) {
  try {
    await fetch("/api/telemetry/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {}
}
