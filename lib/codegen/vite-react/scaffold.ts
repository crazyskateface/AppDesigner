import type { WorkspaceFile, WorkspaceManifest } from "@/lib/workspace/model";
import { createDockerfile } from "@/lib/workspace/templates/vite-react/dockerfile";
import { createIndexHtml } from "@/lib/workspace/templates/vite-react/index-html";
import { createPackageJson } from "@/lib/workspace/templates/vite-react/package-json";
import { createRuntimeControlFiles } from "@/lib/workspace/templates/vite-react/runtime-control-files";
import { createViteConfig } from "@/lib/workspace/templates/vite-react/vite-config";

export function createViteReactScaffoldFiles(title: string, manifest: WorkspaceManifest): WorkspaceFile[] {
  return [
    {
      path: "package.json",
      kind: "config",
      content: createPackageJson(title, manifest),
    },
    {
      path: "vite.config.ts",
      kind: "config",
      content: createViteConfig(),
    },
    {
      path: "index.html",
      kind: "config",
      content: createIndexHtml(title),
    },
    {
      path: manifest.dockerfilePath,
      kind: "config",
      content: createDockerfile(manifest.containerPort),
    },
    {
      path: ".dockerignore",
      kind: "config",
      content: "node_modules\nnpm-debug.log\n",
    },
    ...createRuntimeControlFiles(manifest.containerPort),
    {
      path: "src/main.tsx",
      kind: "source",
      content: `import React from "react";
import ReactDOM from "react-dom/client";
import type { ErrorInfo, ReactNode } from "react";

import App from "./App";
import "./styles.css";

type BrowserRuntimeErrorPayload = {
  source: "error" | "unhandledrejection" | "react-error-boundary";
  message: string;
  stack?: string;
  componentStack?: string;
  href: string;
  timestamp: string;
};

function postRuntimeError(payload: BrowserRuntimeErrorPayload) {
  if (typeof window === "undefined" || window.parent === window) {
    return;
  }

  window.parent.postMessage(
    {
      source: "appdesigner-preview-runtime-error",
      payload,
    },
    "*",
  );
}

function toMessage(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown preview runtime error.",
    stack: undefined,
  };
}

class PreviewErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    postRuntimeError({
      source: "react-error-boundary",
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      href: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
          <h1 style={{ marginBottom: 8, fontSize: 20 }}>Generated preview crashed</h1>
          <p style={{ margin: 0, color: "#475569" }}>
            The builder captured a browser runtime error and can attempt a bounded repair.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

window.addEventListener("error", (event) => {
  const details = toMessage(event.error ?? event.message);
  postRuntimeError({
    source: "error",
    message: details.message,
    stack: details.stack,
    href: window.location.href,
    timestamp: new Date().toISOString(),
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const details = toMessage(event.reason);
  postRuntimeError({
    source: "unhandledrejection",
    message: details.message,
    stack: details.stack,
    href: window.location.href,
    timestamp: new Date().toISOString(),
  });
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PreviewErrorBoundary>
      <App />
    </PreviewErrorBoundary>
  </React.StrictMode>,
);
`,
    },
    {
      path: "tsconfig.json",
      kind: "config",
      content: `${JSON.stringify(
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
      )}\n`,
    },
    {
      path: "src/vite-env.d.ts",
      kind: "source",
      content: '/// <reference types="vite/client" />\n',
    },
  ];
}
