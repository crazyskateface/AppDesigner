import { z } from "zod";

import { isAllowedDirectSourceEditPath } from "@/lib/codegen/vite-react/source-bundle-contract";
import type { WorkspaceFile } from "@/lib/workspace/model";

const directUiEditFileSchema = z.object({
  path: z.string().min(1),
  kind: z.literal("source"),
  content: z.string().min(1),
});

export const directUiEditResultSchema = z
  .object({
    summary: z.string().min(1),
    files: z.array(directUiEditFileSchema).min(1).max(12),
    notes: z.array(z.string().min(1)).max(8).default([]),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();

    for (const [index, file] of value.files.entries()) {
      if (!isAllowedDirectSourceEditPath(file.path)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `File path "${file.path}" is outside the allowed direct UI edit surface.`,
          path: ["files", index, "path"],
        });
      }

      if (seen.has(file.path)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate direct edit file path "${file.path}".`,
          path: ["files", index, "path"],
        });
      }

      seen.add(file.path);
    }
  });

export function buildDirectUiEditPrompts(input: {
  prompt: string;
  currentFiles: WorkspaceFile[];
  appTitle: string;
}) {
  return {
    systemPrompt: [
      "You are editing a bounded React app source tree for a local AI coding workspace.",
      "Return strict JSON only.",
      "This is a direct UI/source edit path for common UI requests.",
      "Normal requests like testimonials, quote blocks, promo sections, embeds, and content/layout additions are supported and should be attempted.",
      "Update only the minimum app-owned source files needed.",
      "Allowed file paths are bounded to src/App.tsx, src/styles.css, src/components/**, and src/pages/**.",
      "Do not output config files, runtime files, Docker files, or prose.",
      "Return full updated file contents for changed files only.",
      "Do not claim the edit is already complete or user-visible in the summary; describe only the attempted file change.",
      "If the file set includes both generic fallback code and more app-specific components or pages, prefer editing the app-specific files.",
    ].join("\n"),
    userPrompt: [
      `App title: ${input.appTitle}`,
      `Edit request: ${input.prompt}`,
      "",
      "Current app-owned source files JSON:",
      JSON.stringify(
        input.currentFiles.map((file) => ({
          path: file.path,
          kind: file.kind,
          content: file.content,
        })),
        null,
        2,
      ),
      "",
      "Produce the smallest believable React source update that satisfies the request.",
    ].join("\n"),
  };
}

export const directUiEditJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "files", "notes"],
  properties: {
    summary: { type: "string", minLength: 1 },
    files: {
      type: "array",
      minItems: 1,
      maxItems: 12,
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
    notes: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1 },
    },
  },
};
