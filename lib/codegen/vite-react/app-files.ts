import type { ProjectBrief } from "@/lib/planner/project-brief";
import type { WorkspaceFile } from "@/lib/workspace/model";
import { createProjectBriefModuleFile } from "@/lib/codegen/vite-react/project-brief-module";

export function createTemplateViteReactAppFiles(brief: ProjectBrief): WorkspaceFile[] {
  return [
    createProjectBriefModuleFile(brief),
    {
      path: "src/App.tsx",
      kind: "source",
      content: `import { projectBrief } from "./project-brief";

export default function App() {
  return (
    <main className="boot-fallback">
      <div className="boot-fallback__card">
        <span className="boot-fallback__eyebrow">Boot fallback</span>
        <h1>{projectBrief.title}</h1>
        <p>{projectBrief.summary}</p>
        <ul>
          {projectBrief.navigation.map((item) => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
`,
    },
    {
      path: "src/styles.css",
      kind: "source",
      content: `:root {
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
  background: #0f172a;
}

.boot-fallback {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
}

.boot-fallback__card {
  width: min(560px, 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  padding: 28px;
  background: rgba(15, 23, 42, 0.88);
}

.boot-fallback__eyebrow {
  display: inline-block;
  margin-bottom: 12px;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #93c5fd;
}

.boot-fallback__card h1 {
  margin: 0 0 12px;
}

.boot-fallback__card p {
  margin: 0 0 20px;
  color: #cbd5e1;
}

.boot-fallback__card ul {
  margin: 0;
  padding-left: 20px;
  color: #cbd5e1;
}
`,
    },
  ];
}
