import type { AppSpec } from "@/lib/domain/app-spec";

function createSpecModule(spec: AppSpec) {
  const serializableSpec = {
    title: spec.title,
    archetype: spec.archetype,
    prompt: spec.prompt,
    navigation: spec.navigation,
    pages: spec.pages,
    entities: spec.entities,
  };

  return `export const appSpec = ${JSON.stringify(serializableSpec, null, 2)} as const;\n`;
}

function createMainTsx() {
  return `import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

function createAppTsx() {
  return `import { useMemo, useState } from "react";

import { appSpec } from "./spec";

function summarizeEntity(entityId?: string) {
  if (!entityId) {
    return [];
  }

  const entity = appSpec.entities.find((item) => item.id === entityId);

  if (!entity) {
    return [];
  }

  return entity.fields.slice(0, 4).map((field) => field.label);
}

export default function App() {
  const [activePageId, setActivePageId] = useState(appSpec.navigation[0]?.pageId ?? appSpec.pages[0]?.id ?? "");

  const activePage = useMemo(
    () => appSpec.pages.find((page) => page.id === activePageId) ?? appSpec.pages[0],
    [activePageId],
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="eyebrow">Generated workspace</span>
          <h1>{appSpec.title}</h1>
          <p>{appSpec.prompt}</p>
        </div>

        <nav className="nav">
          {appSpec.navigation.map((item) => {
            const isActive = item.pageId === activePage?.id;

            return (
              <button
                key={item.id}
                className={isActive ? "nav-item nav-item--active" : "nav-item"}
                onClick={() => setActivePageId(item.pageId)}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="content">
        <header className="hero">
          <div>
            <span className="eyebrow">{appSpec.archetype} prototype</span>
            <h2>{activePage?.title ?? "Preview"}</h2>
            <p>This local workspace is generated from an intermediate app spec and run inside Docker.</p>
          </div>
        </header>

        <section className="section-grid">
          {activePage?.sections.map((section) => (
            <article key={section.id} className="panel">
              <div className="panel-header">
                <h3>{section.title}</h3>
                <span>{section.type}</span>
              </div>

              <div className="section-meta">
                <span>Placement: {section.placement}</span>
                <span>Emphasis: {section.emphasis}</span>
              </div>

              <div className="section-content">
                {summarizeEntity(section.entityId).length > 0 ? (
                  <ul>
                    {summarizeEntity(section.entityId).map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Placeholder content driven by the generated page and section structure.</p>
                )}
              </div>
            </article>
          ))}
        </section>
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
  background: #0b1020;
  color: #edf2ff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(70, 112, 255, 0.18), transparent 28%),
    linear-gradient(180deg, #0b1020 0%, #0f172a 100%);
}

button {
  font: inherit;
}

.shell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  padding: 28px 20px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
}

.brand h1,
.hero h2,
.panel h3 {
  margin: 0;
}

.brand p,
.hero p,
.section-content p,
.section-content li {
  color: #cbd5e1;
}

.eyebrow {
  display: inline-flex;
  margin-bottom: 10px;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8ea6ff;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 28px;
}

.nav-item {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.7);
  color: #e2e8f0;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
}

.nav-item--active {
  border-color: rgba(120, 141, 255, 0.65);
  background: rgba(47, 66, 145, 0.5);
}

.content {
  padding: 32px;
}

.hero {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  padding: 28px;
  background: rgba(15, 23, 42, 0.75);
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.35);
}

.section-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
  margin-top: 24px;
}

.panel {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 20px;
  padding: 20px;
  background: rgba(15, 23, 42, 0.72);
}

.panel-header,
.section-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-header span,
.section-meta span {
  color: #94a3b8;
  font-size: 13px;
}

.section-content ul {
  margin: 0;
  padding-left: 18px;
}

@media (max-width: 920px) {
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

function createTsConfig() {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["DOM", "DOM.Iterable", "ES2020"],
        allowJs: false,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: "ESNext",
        moduleResolution: "Node",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
      },
      include: ["src"],
    },
    null,
    2,
  )}\n`;
}

export function createAppFiles(spec: AppSpec) {
  return [
    { path: "src/spec.ts", kind: "source" as const, content: createSpecModule(spec) },
    { path: "src/main.tsx", kind: "source" as const, content: createMainTsx() },
    { path: "src/App.tsx", kind: "source" as const, content: createAppTsx() },
    { path: "src/styles.css", kind: "source" as const, content: createStylesCss() },
    { path: "src/vite-env.d.ts", kind: "source" as const, content: '/// <reference types="vite/client" />\n' },
    { path: "tsconfig.json", kind: "config" as const, content: createTsConfig() },
  ];
}
