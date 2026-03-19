import type { DiagnosticArtifact } from "@/lib/runtime/diagnostics/diagnostic-artifact";

export function buildFixBundlePrompts(diagnostic: DiagnosticArtifact) {
  const contract = [
    "Return one GeneratedFixBundle object as strict JSON only.",
    "Do not include prose, markdown, or explanations outside the JSON fields.",
    "Return whole-file replacements only.",
    "Modify only the files listed in allowedFiles.",
    "Do not edit scaffold or config files.",
    "Keep the fix bounded and minimal.",
    "The output must include at least one file replacement.",
    "Each file replacement must contain the full file content.",
    "Do not add network calls, servers, auth, databases, or new dependencies.",
    "Use only React and the existing app-owned local imports.",
    "The app uses src/app-meta.ts for metadata only (name, tagline, createdFrom). It does not import or depend on any ProjectBrief or AppSpec data model.",
    'If you modify "src/app-meta.ts", it must export a named `appMeta` constant with name, tagline, and createdFrom fields.',
  ].join("\n");

  return {
    systemPrompt: [
      "You repair bounded app-owned source files for a local-first AI coding orchestrator.",
      "Your job is to fix the current generated app using the diagnostic artifact.",
      contract,
    ].join("\n\n"),
    userPrompt: [
      "DiagnosticArtifact JSON:",
      JSON.stringify(diagnostic, null, 2),
      "",
      diagnostic.projectMemorySummary ? `Project memory summary:\n${diagnostic.projectMemorySummary}` : "",
      "",
      "Return the smallest safe whole-file replacements that address the failure.",
    ].filter(Boolean).join("\n"),
  };
}

export const generatedFixBundleJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["fixId", "diagnosticId", "reasoningSummary", "files"],
  properties: {
    fixId: { type: "string", minLength: 1 },
    diagnosticId: { type: "string", minLength: 1 },
    reasoningSummary: { type: "string", minLength: 1 },
    files: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "kind", "content"],
        properties: {
          path: { type: "string", minLength: 1 },
          kind: { type: "string", enum: ["source"] },
          content: { type: "string", minLength: 1 },
        },
      },
    },
  },
};
