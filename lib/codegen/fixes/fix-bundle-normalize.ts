import { z } from "zod";

import { createProjectBriefModuleFile } from "@/lib/codegen/vite-react/project-brief-module";
import { isAllowedGeneratedSourcePath } from "@/lib/codegen/vite-react/source-bundle-contract";
import { generatedFixBundleSchema, type GeneratedFixBundle } from "@/lib/codegen/fixes/fix-bundle-model";
import type { DiagnosticArtifact } from "@/lib/runtime/diagnostics/diagnostic-artifact";

export const validatedGeneratedFixBundleSchema = generatedFixBundleSchema.superRefine((bundle, ctx) => {
  const seen = new Set<string>();

  for (const [index, file] of bundle.files.entries()) {
    if (!isAllowedGeneratedSourcePath(file.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Fix file path "${file.path}" is not allowed.`,
        path: ["files", index, "path"],
      });
    }

    if (seen.has(file.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate fix file path "${file.path}".`,
        path: ["files", index, "path"],
      });
    }

    seen.add(file.path);
  }
});

type GeneratedFixBundleCandidate = Partial<GeneratedFixBundle> & {
  files?: Array<{ path?: string; kind?: string; content?: string }>;
};

export function normalizeGeneratedFixBundleCandidate(candidate: unknown, diagnostic: DiagnosticArtifact): GeneratedFixBundleCandidate {
  const value = isRecord(candidate) ? candidate : {};
  const allowedFiles = new Set(diagnostic.allowedFiles);
  const files = Array.isArray(value.files)
    ? value.files
        .map((file) => {
          const record = isRecord(file) ? file : {};
          const path = normalizePath(record.path);
          const content = normalizeContent(record.content);

          if (!path || !content || !allowedFiles.has(path)) {
            return null;
          }

          return {
            path,
            kind: "source" as const,
            content,
          };
        })
        .filter((file): file is NonNullable<typeof file> => Boolean(file))
    : [];

  const byPath = new Map(files.map((file) => [file.path, file]));

  if (byPath.has("src/project-brief.ts")) {
    byPath.set("src/project-brief.ts", createProjectBriefModuleFile(diagnostic.projectBrief));
  }

  const dedupedFiles = Array.from(byPath.values());

  return {
    fixId: normalizeText(value.fixId) || `fix-${diagnostic.diagnosticId}`,
    diagnosticId: diagnostic.diagnosticId,
    reasoningSummary: normalizeText(value.reasoningSummary) || "Applied bounded repairs to generated app files.",
    files: dedupedFiles,
  };
}

export function validateGeneratedFixBundleCandidate(candidate: unknown) {
  return validatedGeneratedFixBundleSchema.safeParse(candidate);
}

function normalizePath(value: unknown) {
  return normalizeText(value).replace(/\\/g, "/").replace(/^\.\//, "");
}

function normalizeContent(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.replace(/\r\n/g, "\n").trimEnd();
  return normalized ? `${normalized}\n` : "";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
