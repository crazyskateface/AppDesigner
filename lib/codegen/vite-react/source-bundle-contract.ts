import { projectBriefTargetKindValues, type ProjectBrief } from "@/lib/planner/project-brief";

export const viteReactGeneratedSourceRequiredPaths = ["src/app-meta.ts", "src/App.tsx", "src/styles.css"] as const;

export function isAllowedDirectSourceEditPath(path: string) {
  return (
    path === "src/App.tsx" ||
    path === "src/styles.css" ||
    path === "src/app-meta.ts" ||
    /^src\/components\/(?:[A-Za-z0-9-]+\/)*[A-Za-z0-9-]+\.(ts|tsx)$/.test(path) ||
    /^src\/pages\/(?:[A-Za-z0-9-]+\/)*[A-Za-z0-9-]+\.(ts|tsx)$/.test(path) ||
    /^src\/routes\/(?:[A-Za-z0-9-]+\/)*[A-Za-z0-9-]+\.(ts|tsx)$/.test(path) ||
    /^src\/lib\/(?:[A-Za-z0-9-]+\/)*[A-Za-z0-9-]+\.ts$/.test(path)
  );
}

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
    "- src/app-meta.ts",
    "- src/App.tsx",
    "- src/styles.css",
    "- src/components/*.ts",
    "- src/components/*.tsx",
    "- src/pages/**/*.ts",
    "- src/pages/**/*.tsx",
    "- src/routes/**/*.ts",
    "- src/routes/**/*.tsx",
    "- src/lib/**/*.ts",
    "Required files: src/app-meta.ts, src/App.tsx, src/styles.css.",
    "The deterministic scaffold already provides src/main.tsx, package.json, Vite config, tsconfig, and Docker plumbing.",
    'src/main.tsx already imports a default export from "./App" and imports "./styles.css".',
    "",
    "## Source-first generation rules",
    "",
    "Generate a normal small React app with explicit page components under src/pages/.",
    "Each page must be an independent .tsx file with self-contained JSX and baked-in content.",
    "Do NOT import or iterate over any serialized data model, config array, or spec object at runtime.",
    "Do NOT import projectBrief, appSpec, or any similar structured data blob.",
    "Bake all page structure, section titles, and placeholder content directly into JSX as literal strings.",
    "Small duplication across page components is acceptable and preferred over shared data abstractions.",
    "",
    "src/app-meta.ts must export a named constant `appMeta` with exactly three fields:",
    '  { name: string, tagline: string, createdFrom: string }',
    "appMeta is provenance metadata only — it may be used for a header title or footer, never to drive page structure.",
    "",
    "The generated app should look like a small hand-written React app.",
    "A follow-up LLM edit should be able to modify any page by editing its .tsx file directly, without regenerating any spec or data model.",
    "",
    "Keep this as a static TypeScript React app.",
    "Do not add API calls, servers, databases, or authentication.",
    'You may import from React, local app files, and approved npm packages that you explicitly declare in packageRequirements.',
    "Use packageRequirements only when the app genuinely benefits from an external React-friendly package.",
    "Prefer a small set of package requirements and keep the app bootable without custom build tooling.",
    "Make the app feel product-like and specific to the project description, not generic placeholder UI.",
    "The app structure may include routes, pages, nested components, and app-specific lib helpers if useful.",
  ].join("\n");

  return {
    systemPrompt: [
      "You generate app-specific source files for a local-first AI coding orchestrator.",
      "Your job is to turn a project description into a bounded source bundle for a Vite + React workspace.",
      "The project description below is generation context only — do not serialize or import it in the generated code.",
      contract,
    ].join("\n\n"),
    userPrompt: [
      "Project description (generation context only — do not serialize into source):",
      JSON.stringify(brief, null, 2),
      "",
      "Generate the best matching source bundle as a normal, readable React app.",
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
        required: ["name", "section", "version"],
        properties: {
          name: { type: "string", minLength: 1 },
          version: { type: ["string", "null"], minLength: 1 },
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
