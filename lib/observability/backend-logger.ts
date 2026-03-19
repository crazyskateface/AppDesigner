type BackendLogLevel = "info" | "warn" | "error";

type PrimitiveContextValue = string | number | boolean | null | undefined;

function formatContextValue(value: PrimitiveContextValue) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

export function logBackendEvent(input: {
  area: string;
  event: string;
  message: string;
  level?: BackendLogLevel;
  context?: Record<string, PrimitiveContextValue>;
  error?: unknown;
}) {
  const level = input.level ?? "info";
  const contextParts = Object.entries(input.context ?? {})
    .map(([key, value]) => {
      const formatted = formatContextValue(value);
      return formatted === null ? null : `${key}=${formatted}`;
    })
    .filter((value): value is string => Boolean(value));
  const suffix = contextParts.length ? ` ${contextParts.join(" ")}` : "";
  const line = `[AppDesigner][${input.area}] ${input.event}: ${input.message}${suffix}`;

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }

  if (input.error) {
    console.error(input.error);
  }
}
