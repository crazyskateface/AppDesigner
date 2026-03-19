export function logStructuredProviderResponse(label: string, payload: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (typeof payload === "string") {
    console.log(`[AppDesigner][${label}]\n${payload}`);
    return;
  }

  try {
    console.log(`[AppDesigner][${label}]`, JSON.stringify(payload, null, 2));
  } catch {
    console.log(`[AppDesigner][${label}]`, payload);
  }
}
