import { projectBriefTargetKindValues, type ProjectBrief } from "@/lib/planner/project-brief";

export const viteReactGeneratedSourceRequiredPaths = ["src/project-brief.ts", "src/App.tsx", "src/styles.css"] as const;

export function isAllowedGeneratedSourcePath(path: string) {
  return (
    viteReactGeneratedSourceRequiredPaths.includes(path as (typeof viteReactGeneratedSourceRequiredPaths)[number]) ||
    /^src\/components\/(?:[A-Za-z0-9-]+\/)*[A-Za-z0-9-]+\.(ts|tsx)$/.test(path) ||
    /^src\/pages\/(?:[A-Za-z0-9-]+\/)*[A-Za-z0-9-]+\.(ts|tsx)$/.test(path) ||
    /^src\/routes\/(?:[A-Za-z0-9-]+\/)*[A-Za-z0-9-]+\.(ts|tsx)$/.test(path) ||
    /^src\/lib\/(?:[A-Za-z0-9-]+\/)*[A-Za-z0-9-]+\.ts$/.test(path)
  );
}

export function buildViteReactSourceBundlePrompts(brief: ProjectBrief) {
  const contract = [
    "Return one GeneratedSourceBundle object as strict JSON only.",
    "Do not include prose, markdown, or explanations.",
    `targetKind must be one of: ${projectBriefTargetKindValues.join(", ")}.`,
    "entryModule must be src/App.tsx.",
    "Only output source files. Do not output config or asset files.",
    "Allowed file paths:",
    "- src/project-brief.ts",
    "- src/App.tsx",
    "- src/styles.css",
    "- src/components/*.ts",
    "- src/components/*.tsx",
    "- src/pages/**/*.ts",
    "- src/pages/**/*.tsx",
    "- src/routes/**/*.ts",
    "- src/routes/**/*.tsx",
    "- src/lib/**/*.ts",
    "Required files: src/project-brief.ts, src/App.tsx, src/styles.css.",
    "The deterministic scaffold already provides src/main.tsx, package.json, Vite config, tsconfig, and Docker plumbing.",
    'src/main.tsx already imports a default export from "./App" and imports "./styles.css".',
    "The ProjectBrief shape is: title, summary, prompt, navigation[], pages[].",
    "Each page has: id, title, pageType, summary, sectionTitles[].",
    "There is no top-level projectBrief.sections field.",
    "Read section labels from projectBrief.pages[n].sectionTitles.",
    "Keep this as a static TypeScript React app.",
    "Do not add API calls, servers, databases, or authentication.",
    'You may import from React, local app files, and approved npm packages that you explicitly declare in packageRequirements.',
    "Use packageRequirements only when the app genuinely benefits from an external React-friendly package.",
    "Prefer a small set of package requirements and keep the app bootable without custom build tooling.",
    "Code must not assume undocumented fields exist on projectBrief.",
    "Make the app feel product-like and specific to the ProjectBrief, not generic placeholder UI.",
    "The app structure may include routes, pages, nested components, and app-specific lib helpers if useful.",
  ].join("\n");

  return {
    systemPrompt: [
      "You generate app-specific source files for a local-first AI coding orchestrator.",
      "Your job is to turn a ProjectBrief into a bounded source bundle for a Vite + React workspace.",
      contract,
    ].join("\n\n"),
    userPrompt: [
      "ProjectBrief JSON:",
      JSON.stringify(brief, null, 2),
      "",
      "Generate the best matching source bundle for this project brief.",
    ].join("\n"),
  };
}

export const generatedSourceBundleJsonSchema: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["bundleId", "targetKind", "entryModule", "files", "notes"],
  properties: {
    bundleId: { type: "string", minLength: 1 },
    targetKind: { type: "string", enum: [...projectBriefTargetKindValues] },
    entryModule: { type: "string", enum: ["src/App.tsx"] },
    files: {
      type: "array",
      minItems: 2,
      maxItems: 24,
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
    packageRequirements: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "section"],
        properties: {
          name: { type: "string", minLength: 1 },
          version: { type: "string", minLength: 1 },
          section: { type: "string", enum: ["dependencies", "devDependencies"] },
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
