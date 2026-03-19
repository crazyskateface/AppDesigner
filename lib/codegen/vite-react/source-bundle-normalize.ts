import { z } from "zod";

import type { GeneratedSourceBundle } from "@/lib/codegen/model";
import { createAppMetaModuleFile } from "@/lib/codegen/vite-react/app-meta-module";
import { isAllowedGeneratedSourcePath, viteReactGeneratedSourceRequiredPaths } from "@/lib/codegen/vite-react/source-bundle-contract";
import { slugify } from "@/lib/domain/app-spec/parse";
import type { ProjectBrief } from "@/lib/planner/project-brief";

const sourceFileSchema = z.object({
  path: z.string().min(1),
  kind: z.literal("source"),
  content: z.string().min(1),
});

export const generatedSourceBundleSchema = z
  .object({
    bundleId: z.string().min(1),
    targetKind: z.literal("vite-react-static"),
    entryModule: z.literal("src/App.tsx"),
    files: z.array(sourceFileSchema).min(3).max(24),
    packageRequirements: z.array(
      z.object({
        name: z.string().min(1),
        version: z.string().min(1).optional(),
        section: z.enum(["dependencies", "devDependencies"]).default("dependencies"),
      }),
    ).max(8).default([]),
    notes: z.array(z.string().min(1)).max(8).default([]),
  })
  .superRefine((bundle, ctx) => {
    const seen = new Set<string>();

    for (const [index, file] of bundle.files.entries()) {
      if (!isAllowedGeneratedSourcePath(file.path)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `File path "${file.path}" is not allowed in the generated source bundle.`,
          path: ["files", index, "path"],
        });
      }

      if (seen.has(file.path)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate generated file path "${file.path}".`,
          path: ["files", index, "path"],
        });
      }

      seen.add(file.path);
    }

    for (const requiredPath of viteReactGeneratedSourceRequiredPaths) {
      if (!bundle.files.some((file) => file.path === requiredPath)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Required generated file "${requiredPath}" is missing.`,
          path: ["files"],
        });
      }
    }

    for (const [index, file] of bundle.files.entries()) {
      if (file.content.includes("projectBrief.") || file.content.includes("appSpec.")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Generated file "${file.path}" references a serialized data model (projectBrief or appSpec). Generated code must use baked-in JSX, not data-driven rendering.`,
          path: ["files", index, "content"],
        });
      }

      if (/import\s.*(?:projectBrief|project-brief|appSpec|spec)\b/.test(file.content) && file.path !== "src/app-meta.ts") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Generated file "${file.path}" imports a serialized data model. Use baked-in content instead.`,
          path: ["files", index, "content"],
        });
      }
    }
  });

type GeneratedSourceBundleCandidate = Partial<GeneratedSourceBundle> & {
  files?: Array<{ path?: string; kind?: string; content?: string }>;
};

export function normalizeGeneratedSourceBundleCandidate(candidate: unknown, brief: ProjectBrief): GeneratedSourceBundleCandidate {
  const value = isRecord(candidate) ? candidate : {};
  const files = normalizeFiles(value.files, brief);

  return {
    bundleId: normalizeText(value.bundleId) || `bundle-${slugify(brief.briefId) || "generated"}`,
    targetKind: "vite-react-static",
    entryModule: "src/App.tsx",
    files,
    packageRequirements: normalizePackageRequirements(value.packageRequirements),
    notes: normalizeNotes(value.notes),
  };
}

export function validateGeneratedSourceBundleCandidate(candidate: unknown) {
  return generatedSourceBundleSchema.safeParse(candidate);
}

function normalizeFiles(value: unknown, brief: ProjectBrief) {
  const byPath = new Map<string, { path: string; kind: "source"; content: string }>();

  if (Array.isArray(value)) {
    for (const item of value) {
      const record = isRecord(item) ? item : {};
      const path = normalizePath(record.path);
      const content = normalizeContent(record.content);

      if (!path || !content) {
        continue;
      }

      byPath.set(path, {
        path,
        kind: "source",
        content,
      });
    }
  }

  // Always inject the canonical app-meta module.
  const appMetaModule = createAppMetaModuleFile(brief);
  byPath.set(appMetaModule.path, appMetaModule);

  return Array.from(byPath.values()).sort(compareGeneratedSourceFiles);
}

function compareGeneratedSourceFiles(
  left: { path: string; kind: "source"; content: string },
  right: { path: string; kind: "source"; content: string },
) {
  return rankPath(left.path) - rankPath(right.path) || left.path.localeCompare(right.path);
}

function rankPath(path: string) {
  switch (path) {
    case "src/app-meta.ts":
      return 0;
    case "src/App.tsx":
      return 1;
    case "src/styles.css":
      return 2;
    default:
      return 3;
  }
}

function normalizePath(value: unknown) {
  const normalized = normalizeText(value).replace(/\\/g, "/").replace(/^\.\//, "");
  return normalized;
}

function normalizeContent(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.replace(/\r\n/g, "\n").trimEnd();
  return normalized ? `${normalized}\n` : "";
}

function normalizeNotes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeText(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, 8);
}

function normalizePackageRequirements(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: Array<{ name: string; version?: string; section: "dependencies" | "devDependencies" }> = [];

  for (const item of value) {
    const record = isRecord(item) ? item : {};
    const name = normalizeText(record.name);
    const version = normalizeText(record.version) || undefined;
    const section = record.section === "devDependencies" ? "devDependencies" : "dependencies";

    if (!name || seen.has(`${section}:${name.toLowerCase()}`)) {
      continue;
    }

    seen.add(`${section}:${name.toLowerCase()}`);
    normalized.push({
      name,
      version,
      section,
    });
  }

  return normalized.slice(0, 8);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
