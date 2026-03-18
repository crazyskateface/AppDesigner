"use client";

import type { RuntimeLogEntry } from "@/lib/runtime/logs";
import type { RuntimeLogPage, RuntimeSession } from "@/lib/runtime/service/dto";

type StartRuntimeInput = {
  projectId: string;
  generatedSpec: import("@/lib/domain/app-spec").AppSpec;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as { error?: string } | T | null;

  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? data.error : "Runtime request failed.";
    throw new Error(message || "Runtime request failed.");
  }

  return data as T;
}

export async function startRuntime(input: StartRuntimeInput) {
  const response = await fetch("/api/runtime/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<RuntimeSession>(response);
}

export async function getRuntimeSnapshot(runtimeId: string) {
  const response = await fetch(`/api/runtime/${runtimeId}`, {
    cache: "no-store",
  });

  return parseJsonResponse<RuntimeSession>(response);
}

export async function getRuntimeLogs(runtimeId: string) {
  const response = await fetch(`/api/runtime/${runtimeId}/logs`, {
    cache: "no-store",
  });

  return parseJsonResponse<RuntimeLogPage>(response);
}

export async function stopRuntime(runtimeId: string) {
  const response = await fetch(`/api/runtime/${runtimeId}/stop`, {
    method: "POST",
  });

  return parseJsonResponse<RuntimeSession>(response);
}

export async function awaitRuntimeReady(runtimeId: string, attempts = 30, delayMs = 1_000) {
  let current = await getRuntimeSnapshot(runtimeId);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (current.status === "running" || current.status === "failed" || current.status === "stopped") {
      return current;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    current = await getRuntimeSnapshot(runtimeId);
  }

  return current;
}

export function takeRecentRuntimeLogs(entries: RuntimeLogEntry[], count = 8) {
  return entries.slice(-count);
}
