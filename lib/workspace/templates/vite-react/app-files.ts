import type { AppSpec, AppSpecPage } from "@/lib/domain/app-spec";

function toComponentName(title: string): string {
  return (
    title
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("") + "Page"
  );
}

function toPageKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createAppMetaModule(spec: AppSpec) {
  const meta = {
    name: spec.title,
    tagline: `${spec.archetype.charAt(0).toUpperCase() + spec.archetype.slice(1)} workspace for ${spec.title}.`,
    createdFrom: spec.prompt,
  };

  return `export const appMeta = ${JSON.stringify(meta, null, 2)} as const;\n`;
}

function createPageComponent(page: AppSpecPage): string {
  const componentName = toComponentName(page.title);
  const sectionCards = page.sections
    .map(
      (section) =>
        `        <div className="card">
          <h3>${section.title}</h3>
          <p>${section.type} section — ${section.placement} placement.</p>
        </div>`,
    )
    .join("\n");

  return `export default function ${componentName}() {
  return (
    <div className="page">
      <h2>${page.title}</h2>
      <div className="section-grid">
${sectionCards}
      </div>
    </div>
  );
}
`;
}

function createAppTsx(spec: AppSpec) {
  const pageEntries = spec.pages.map((page) => ({
    key: toPageKey(page.title),
    componentName: toComponentName(page.title),
    label: page.title,
  }));

  const imports = pageEntries
    .map((entry) => `import ${entry.componentName} from "./pages/${entry.componentName}";`)
    .join("\n");

  const pagesMap = pageEntries
    .map((entry) => `  "${entry.key}": ${entry.componentName},`)
    .join("\n");

  const navButtons = pageEntries
    .map(
      (entry) =>
        `          <button
            className={activePage === "${entry.key}" ? "nav-item nav-item--active" : "nav-item"}
            onClick={() => setActivePage("${entry.key}")}
            type="button"
          >
            ${entry.label}
          </button>`,
    )
    .join("\n");

  const defaultKey = pageEntries[0]?.key ?? "dashboard";

  return `import { useState } from "react";
import { appMeta } from "./app-meta";
${imports}

const pages: Record<string, React.ComponentType> = {
${pagesMap}
};

export default function App() {
  const [activePage, setActivePage] = useState("${defaultKey}");
  const Page = pages[activePage] ?? Object.values(pages)[0];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <h1>{appMeta.name}</h1>
          <p className="tagline">{appMeta.tagline}</p>
        </div>
        <nav className="nav">
${navButtons}
        </nav>
      </aside>
      <main className="content">
        {Page ? <Page /> : null}
      </main>
    </div>
  );
}
`;
}

function createStylesCss() {
  return `:root {
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(70, 112, 255, 0.14), transparent 28%),
    linear-gradient(180deg, #0f172a 0%, #0b1020 100%);
}

button {
  font: inherit;
}

.shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  padding: 28px 20px;
  background: rgba(15, 23, 42, 0.92);
}

.brand h1 {
  margin: 0 0 6px;
  font-size: 18px;
}

.tagline {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.5;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 28px;
}

.nav-item {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.nav-item:hover {
  border-color: rgba(148, 163, 184, 0.3);
}

.nav-item--active {
  border-color: rgba(120, 141, 255, 0.6);
  background: rgba(47, 66, 145, 0.45);
}

.content {
  padding: 32px;
}

.page h2 {
  margin: 0 0 20px;
  font-size: 22px;
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.card {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  padding: 20px;
  background: rgba(15, 23, 42, 0.72);
}

.card h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

.card p {
  margin: 0;
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.5;
}

@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  }
}
`;
}

export function createAppFiles(spec: AppSpec) {
  const files: Array<{ path: string; kind: "source"; content: string }> = [
    { path: "src/app-meta.ts", kind: "source", content: createAppMetaModule(spec) },
    { path: "src/App.tsx", kind: "source", content: createAppTsx(spec) },
    { path: "src/styles.css", kind: "source", content: createStylesCss() },
  ];

  for (const page of spec.pages) {
    const componentName = toComponentName(page.title);
    files.push({
      path: `src/pages/${componentName}.tsx`,
      kind: "source",
      content: createPageComponent(page),
    });
  }

  return files;
}
