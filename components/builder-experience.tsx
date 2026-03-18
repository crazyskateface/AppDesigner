"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChatHistoryPanel } from "@/components/builder/chat-history-panel";
import { RuntimePreviewPanel } from "@/components/builder/runtime-preview-panel";
import { WorkspaceTerminal } from "@/components/builder/workspace-terminal";
import { AppShellPreview } from "@/components/preview/app-shell/app-shell-preview";
import { generateAppSpec, type AppSpec } from "@/lib/domain/app-spec";
import type { PersistedProject } from "@/lib/persistence/local-projects/schema";
import { loadLastOpenProject, loadProject, saveProject } from "@/lib/persistence/local-projects/storage";
import { appSpecToPreviewModel } from "@/lib/preview/adapters/spec-to-preview";
import { takeRecentRuntimeLogs, startRuntime, stopRuntime, getRuntimeLogs, getRuntimeSnapshot } from "@/lib/runtime/client/runtime-api";
import type { RuntimeLogEntry } from "@/lib/runtime/logs";
import type { RuntimeSession } from "@/lib/runtime/service/dto";

const autosaveDelayMs = 400;
const runtimePollIntervalMs = 1500;
const seedPrompt = "";

export function BuilderExperience() {
  const searchParams = useSearchParams();
  const requestedProjectId = searchParams.get("project");

  const [prompt, setPrompt] = useState(seedPrompt);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectCreatedAt, setProjectCreatedAt] = useState<string | null>(null);
  const [currentSpec, setCurrentSpec] = useState<AppSpec | null>(null);
  const [selectedPreviewPageId, setSelectedPreviewPageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [hasHydratedPersistence, setHasHydratedPersistence] = useState(false);
  const [runtimeSession, setRuntimeSession] = useState<RuntimeSession | null>(null);
  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeLogEntry[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [isRuntimeActionPending, setIsRuntimeActionPending] = useState(false);
  const runtimePollRef = useRef<number | null>(null);

  const hasSpec = currentSpec !== null;
  const effectiveSpec = useMemo(() => currentSpec, [currentSpec]);
  const previewModel = useMemo(
    () => (effectiveSpec ? appSpecToPreviewModel(effectiveSpec) : null),
    [effectiveSpec],
  );

  useEffect(() => {
    return () => {
      if (runtimePollRef.current) {
        window.clearInterval(runtimePollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!runtimeSession?.runtimeId || (runtimeSession.status !== "preparing" && runtimeSession.status !== "starting")) {
      if (runtimePollRef.current) {
        window.clearInterval(runtimePollRef.current);
        runtimePollRef.current = null;
      }
      return;
    }

    const runtimeId = runtimeSession.runtimeId;

    async function refreshRuntimeState() {
      try {
        const snapshot = await getRuntimeSnapshot(runtimeId);
        setRuntimeSession(snapshot);

        if (snapshot.status === "starting" || snapshot.status === "failed") {
          const logs = await getRuntimeLogs(runtimeId);
          setRuntimeLogs(takeRecentRuntimeLogs(logs.entries));
        }

        if (snapshot.status === "running" || snapshot.status === "failed" || snapshot.status === "stopped") {
          if (runtimePollRef.current) {
            window.clearInterval(runtimePollRef.current);
            runtimePollRef.current = null;
          }
        }
      } catch (error) {
        setRuntimeError(error instanceof Error ? error.message : "Could not refresh runtime status.");
        if (runtimePollRef.current) {
          window.clearInterval(runtimePollRef.current);
          runtimePollRef.current = null;
        }
      }
    }

    void refreshRuntimeState();

    if (runtimePollRef.current) {
      window.clearInterval(runtimePollRef.current);
    }

    runtimePollRef.current = window.setInterval(() => {
      void refreshRuntimeState();
    }, runtimePollIntervalMs);

    return () => {
      if (runtimePollRef.current) {
        window.clearInterval(runtimePollRef.current);
        runtimePollRef.current = null;
      }
    };
  }, [runtimeSession?.runtimeId, runtimeSession?.status]);

  useEffect(() => {
    const restoredProject =
      (requestedProjectId ? loadProject(requestedProjectId) : null) ?? loadLastOpenProject();

    if (restoredProject) {
      restoreProject(restoredProject);
      setSessionNotice(
        requestedProjectId ? "Opened a saved local project." : "Restored your last local project.",
      );
    }

    setHasHydratedPersistence(true);
  }, [requestedProjectId]);

  useEffect(() => {
    if (!previewModel) {
      setSelectedPreviewPageId(null);
      return;
    }

    if (!previewModel.navigation.some((item) => item.pageId === selectedPreviewPageId)) {
      setSelectedPreviewPageId(previewModel.navigation[0]?.pageId ?? null);
    }
  }, [previewModel, selectedPreviewPageId]);

  useEffect(() => {
    if (!hasHydratedPersistence) {
      return;
    }

    const isSeedState =
      !currentSpec &&
      selectedPreviewPageId === null &&
      prompt.trim() === seedPrompt;

    if (isSeedState || (!prompt.trim() && !currentSpec)) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      const nextProjectId = projectId ?? crypto.randomUUID();
      const createdAt = projectCreatedAt ?? new Date().toISOString();
      const now = new Date().toISOString();

      const snapshot: PersistedProject = {
        storageVersion: 1,
        projectId: nextProjectId,
        createdAt,
        updatedAt: now,
        lastOpenedAt: now,
        prompt,
        generatedSpec: currentSpec,
        manualTitleOverride: null,
        selectedPreviewPageId,
      };

      try {
        saveProject(snapshot);
        if (!projectId) {
          setProjectId(nextProjectId);
        }
        if (!projectCreatedAt) {
          setProjectCreatedAt(createdAt);
        }
      } catch {
        setSessionNotice("Could not save locally. Your current session is still available.");
      }
    }, autosaveDelayMs);

    return () => window.clearTimeout(saveTimer);
  }, [
    currentSpec,
    hasHydratedPersistence,
    projectCreatedAt,
    projectId,
    prompt,
    selectedPreviewPageId,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt.length < 20) {
      setGenerationError(
        "Be a little more specific so the builder has enough context to generate a believable app spec.",
      );
      return;
    }

    setIsLoading(true);
    setGenerationError(null);

    try {
      if (runtimeSession?.runtimeId) {
        await handleStopRuntime();
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
      const generatedSpec = generateAppSpec(trimmedPrompt);
      const nextPreviewModel = appSpecToPreviewModel(generatedSpec);
      console.log("Generated AppSpec", generatedSpec);
      setCurrentSpec(generatedSpec);
      setRuntimeError(null);
      setRuntimeLogs([]);
      setSelectedPreviewPageId(
        nextPreviewModel.navigation.some((item) => item.pageId === selectedPreviewPageId)
          ? selectedPreviewPageId
          : (nextPreviewModel.navigation[0]?.pageId ?? null),
      );
    } catch {
      setGenerationError("The local builder could not generate a valid app spec from that prompt.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartRuntime() {
    if (!effectiveSpec) {
      return;
    }

    setIsRuntimeActionPending(true);
    setRuntimeError(null);

    try {
      const nextProjectId = projectId ?? crypto.randomUUID();
      const createdAt = projectCreatedAt ?? new Date().toISOString();

      if (!projectId) {
        setProjectId(nextProjectId);
      }

      if (!projectCreatedAt) {
        setProjectCreatedAt(createdAt);
      }

      const session = await startRuntime({
        projectId: nextProjectId,
        generatedSpec: effectiveSpec,
      });

      setRuntimeSession(session);
      setRuntimeLogs([]);

      if (session.status === "failed") {
        const logs = await getRuntimeLogs(session.runtimeId);
        setRuntimeLogs(takeRecentRuntimeLogs(logs.entries));
      }
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Could not start live runtime preview.");
    } finally {
      setIsRuntimeActionPending(false);
    }
  }

  async function handleStopRuntime() {
    if (!runtimeSession?.runtimeId) {
      return;
    }

    setIsRuntimeActionPending(true);

    try {
      const stoppedSession = await stopRuntime(runtimeSession.runtimeId);
      setRuntimeSession(stoppedSession);
    } catch (error) {
      setRuntimeError(error instanceof Error ? error.message : "Could not stop live runtime preview.");
    } finally {
      setIsRuntimeActionPending(false);
    }
  }

  function restoreProject(project: PersistedProject) {
    setProjectId(project.projectId);
    setProjectCreatedAt(project.createdAt);
    setPrompt(project.prompt || seedPrompt);
    setCurrentSpec(project.generatedSpec);
    setSelectedPreviewPageId(project.selectedPreviewPageId);
    setGenerationError(null);
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[var(--color-canvas)] px-3 py-3 lg:px-4">
      <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(280px,20vw)_minmax(0,1fr)]">
        <aside className="grid min-h-0 overflow-hidden gap-3 lg:grid-rows-[minmax(0,1fr)_auto]">
          <ChatHistoryPanel />

          <section className="flex flex-col rounded-[1.35rem] border border-black/8 bg-white p-3 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-[var(--color-ink)]">Prompt</p>
              {sessionNotice ? <p className="text-[11px] leading-5 text-[var(--color-muted)]">{sessionNotice}</p> : null}
            </div>

            <form className="mt-3 flex flex-col" onSubmit={handleSubmit}>
              <label htmlFor="app-prompt" className="sr-only">
                Prompt
              </label>
              <textarea
                id="app-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={6}
                className="w-full rounded-[1.1rem] border border-black/10 bg-[var(--color-panel)] px-4 py-3 text-[15px] leading-7 text-[var(--color-ink)] outline-none transition focus:border-black/20"
                placeholder="Build a lightweight CRM for a solo consultant to track leads, meetings, follow-ups, and deal stages."
              />

              {generationError ? (
                <div className="mt-3 rounded-[0.95rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {generationError}
                </div>
              ) : null}

              {isLoading ? (
                <div className="mt-3 rounded-[0.95rem] border border-black/8 bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-muted)]">
                  Generating the app spec...
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-ink-soft)] disabled:cursor-not-allowed disabled:bg-[var(--color-muted)]"
              >
                {isLoading ? "Generating..." : hasSpec ? "Regenerate app" : "Generate app"}
              </button>
            </form>
          </section>
        </aside>

        <section className="grid min-h-0 gap-3 lg:grid-rows-[minmax(0,1fr)_auto]">
          <section className="min-h-0">
            <RuntimePreviewPanel
              session={runtimeSession}
              error={runtimeError}
              isPending={isRuntimeActionPending}
              canStart={Boolean(effectiveSpec)}
              onStart={() => void handleStartRuntime()}
              onStop={() => void handleStopRuntime()}
              schemaPreview={
                <AppShellPreview
                  model={previewModel}
                  activePageId={selectedPreviewPageId}
                  onSelectPage={setSelectedPreviewPageId}
                  isLoading={isLoading}
                  error={generationError}
                />
              }
            />
          </section>

          <WorkspaceTerminal
            entries={runtimeLogs}
            runtimeSession={runtimeSession}
            runtimeError={runtimeError}
          />
        </section>
      </div>
    </div>
  );
}
