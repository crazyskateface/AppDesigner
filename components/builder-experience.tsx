"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatHistoryPanel } from "@/components/builder/chat-history-panel";
import { ClarificationForm } from "@/components/builder/clarification-form";
import { RuntimePreviewPanel } from "@/components/builder/runtime-preview-panel";
import { WorkspaceTerminal } from "@/components/builder/workspace-terminal";
import { AppShellPreview } from "@/components/preview/app-shell/app-shell-preview";
import { createAssistantActivity, createAssistantResponseActivity, createUserPromptActivity } from "@/lib/builder/activity/create-activity-item";
import type { BuilderActivityItem } from "@/lib/builder/activity/model";
import {
  createContainerRestartRequiredActivity,
  createBrowserRuntimeErrorActivity,
  createClarificationAnswersActivity,
  createClarificationQuestionsActivity,
  createDevServerRestartedActivity,
  createGenerationFailedActivity,
  createHotUpdateAppliedActivity,
  createHotUpdateAttemptActivity,
  createInitialBuilderActivity,
  createRepairStartedActivity,
  createRuntimeActionActivity,
  deriveRepairAttemptActivities,
  deriveRuntimeStatusActivities,
} from "@/lib/builder/activity/runtime-activity";
import {
  builderGenerateResponseSchema,
  type GenerationReadyResponse,
} from "@/lib/builder/generation/contract";
import { resolveBuilderMode } from "@/lib/builder/generation-mode";
import { getEditGenerationNoopMessage } from "@/lib/builder/edit-generation-result";
import { deriveGroundedBuildResult } from "@/lib/builder/result/derive-result";
import type { AppSpec, BuilderMode } from "@/lib/domain/app-spec";
import { replaceRuntimeForSpec, RuntimeReplacementError } from "@/lib/builder/runtime-flow";
import type { PersistedProject } from "@/lib/persistence/local-projects/schema";
import { loadLastOpenProject, loadProject, saveProject } from "@/lib/persistence/local-projects/storage";
import type { ClarificationQuestion } from "@/lib/planner/clarification/types";
import type { ClarificationAnswer } from "@/lib/planner/prompt-context";
import { logClientEvent } from "@/lib/observability/client-events";
import { appSpecToPreviewModel } from "@/lib/preview/adapters/spec-to-preview";
import type { ProjectBuildMemory, ProjectMemoryChange } from "@/lib/project-memory/schema";
import { summarizeRuntimeSessionForProjectMemory } from "@/lib/project-memory/summarize";
import {
  ensureProjectBuildMemory,
  rememberClarificationAnswers,
  rememberGroundedBuildResult,
  rememberGenerationFailure,
  rememberPromptSubmission,
  rememberRepairAttemptOutcome,
} from "@/lib/project-memory/update-memory";
import {
  awaitRuntimeReady,
  takeRecentRuntimeLogs,
  startRuntime,
  stopRuntime,
  getRuntimeLogs,
  getRuntimeSnapshot,
  reportClientRuntimeError,
  updateRuntime,
} from "@/lib/runtime/client/runtime-api";
import type { RuntimeLogEntry } from "@/lib/runtime/logs";
import type { BrowserRuntimeErrorReport, RuntimeSession, RuntimeUpdateResult } from "@/lib/runtime/service/dto";

const autosaveDelayMs = 400;
const runtimePollIntervalMs = 1500;
const seedPrompt = "";

type PendingClarificationState = {
  prompt: string;
  mode: BuilderMode;
  questions: ClarificationQuestion[];
};

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
  const [activityItems, setActivityItems] = useState<BuilderActivityItem[]>(() => [createInitialBuilderActivity()]);
  const [isRuntimeActionPending, setIsRuntimeActionPending] = useState(false);
  const [restoredRuntimeIdToReconnect, setRestoredRuntimeIdToReconnect] = useState<string | null>(null);
  const [pendingClarification, setPendingClarification] = useState<PendingClarificationState | null>(null);
  const [projectMemory, setProjectMemory] = useState<ProjectBuildMemory | null>(null);
  const runtimePollRef = useRef<number | null>(null);
  const hasAttemptedRestoreRuntimeRef = useRef(false);
  const reportedClientErrorSignaturesRef = useRef<Set<string>>(new Set());
  const previousRuntimeSessionRef = useRef<RuntimeSession | null>(null);
  const seenRepairAttemptIdsRef = useRef<Set<string>>(new Set());
  const projectMemoryRef = useRef<ProjectBuildMemory | null>(null);

  const hasSpec = currentSpec !== null;
  const effectiveSpec = useMemo(() => currentSpec, [currentSpec]);
  const previewModel = useMemo(
    () => (effectiveSpec ? appSpecToPreviewModel(effectiveSpec) : null),
    [effectiveSpec],
  );

  const updateStatusNoticeForRuntime = useCallback((session: RuntimeSession) => {
    switch (session.status) {
      case "preparing":
        setSessionNotice("Preparing the runtime workspace...");
        break;
      case "starting":
        setSessionNotice("Starting the live preview...");
        break;
      case "running":
        setSessionNotice(session.previewUrl ? `Live preview running at ${session.previewUrl}` : "Live preview is running.");
        break;
      case "failed":
        setSessionNotice(session.failure?.message ?? "The runtime reported a failure.");
        break;
      case "stopped":
        setSessionNotice("Runtime stopped.");
        break;
    }
  }, []);

  useEffect(() => {
    projectMemoryRef.current = projectMemory;
  }, [projectMemory]);

  const appendActivityItems = useCallback((items: BuilderActivityItem[]) => {
    if (!items.length) {
      return;
    }

    setActivityItems((current) => {
      const seenDedupeKeys = new Set(current.map((item) => item.dedupeKey).filter((value): value is string => Boolean(value)));
      const next = [...current];

      for (const item of items) {
        if (item.dedupeKey && seenDedupeKeys.has(item.dedupeKey)) {
          continue;
        }

        if (item.dedupeKey) {
          seenDedupeKeys.add(item.dedupeKey);
        }

        next.push(item);
      }

      return next;
    });
  }, []);

  const resolveProjectMemory = useCallback((resolvedProjectId?: string) => {
    return ensureProjectBuildMemory(
      resolvedProjectId ?? projectId ?? projectMemoryRef.current?.projectId ?? "draft-project",
      projectMemoryRef.current,
    );
  }, [projectId]);

  const logBuilderEvent = useCallback((
    event: string,
    message: string,
    options: {
      level?: "info" | "warn" | "error";
      runtimeId?: string | null;
      context?: Record<string, string | number | boolean | null | undefined>;
      error?: string | null;
    } = {},
  ) => {
    void logClientEvent({
      area: "builder",
      event,
      message,
      level: options.level,
      projectId,
      runtimeId: options.runtimeId ?? runtimeSession?.runtimeId ?? null,
      context: options.context,
      error: options.error,
    });
  }, [projectId, runtimeSession?.runtimeId]);

  const logProjectMemoryChanges = useCallback(async (
    memory: ProjectBuildMemory,
    changes: ProjectMemoryChange[],
  ) => {
    if (!changes.length) {
      return;
    }

    await fetch("/api/project-memory/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId: memory.projectId,
        changes,
        memory,
      }),
    }).catch(() => undefined);
  }, []);

  const commitProjectMemory = useCallback((
    update: (memory: ProjectBuildMemory) => { memory: ProjectBuildMemory; changes: ProjectMemoryChange[] },
    resolvedProjectId?: string,
  ) => {
    const result = update(resolveProjectMemory(resolvedProjectId));
    projectMemoryRef.current = result.memory;
    setProjectMemory(result.memory);

    if (result.changes.length) {
      void logProjectMemoryChanges(result.memory, result.changes);
    }

    return result.memory;
  }, [logProjectMemoryChanges, resolveProjectMemory]);

  const handleRestartRuntime = useCallback(async (
    nextSpec: AppSpec,
    options: {
      previousRuntimeSession?: RuntimeSession | null;
      preserveCurrentOnFailure: boolean;
      onSpecCommitted?: (spec: AppSpec) => void;
      successNotice?: string | null;
      directEdit?: GenerationReadyResponse["directEdit"];
    },
  ): Promise<RuntimeSession> => {
    setIsRuntimeActionPending(true);
    setRuntimeError(null);

    const previousRuntime = options.previousRuntimeSession ?? runtimeSession;
    const nextProjectId = projectId ?? crypto.randomUUID();
    const createdAt = projectCreatedAt ?? new Date().toISOString();

    try {
      logBuilderEvent("runtime-restart-started", "Starting runtime replacement flow.", {
        runtimeId: previousRuntime?.runtimeId ?? null,
        context: {
          hasPreviousRuntime: Boolean(previousRuntime),
          directEdit: Boolean(options.directEdit),
        },
      });
      if (!projectId) {
        setProjectId(nextProjectId);
      }

      if (!projectCreatedAt) {
        setProjectCreatedAt(createdAt);
      }

      appendActivityItems([
        createRuntimeActionActivity(previousRuntime ? "restart" : "start"),
      ]);

      const nextSession = await replaceRuntimeForSpec({
        candidateSpec: nextSpec,
        previousRuntime,
        startRuntime: async (generatedSpec) =>
          startRuntime({
            projectId: nextProjectId,
            generatedSpec,
            projectMemory: resolveProjectMemory(nextProjectId),
            directEdit: options.directEdit,
          }),
        awaitRuntimeReady: async (session) => awaitRuntimeReady(session.runtimeId),
        stopRuntime: async (runtimeId) => {
          await stopRuntime(runtimeId);
        },
      });

      options.onSpecCommitted?.(nextSpec);
      setRuntimeSession(nextSession);
      setRuntimeLogs([]);
      setSessionNotice(options.successNotice ?? null);
      setGenerationError(null);
      setRestoredRuntimeIdToReconnect(null);
      return nextSession;
    } catch (error) {
      if (error instanceof RuntimeReplacementError && error.failedSession?.runtimeId) {
        try {
          const logs = await getRuntimeLogs(error.failedSession.runtimeId);
          setRuntimeLogs(takeRecentRuntimeLogs(logs.entries));
        } catch {}
      }

      if (!options.preserveCurrentOnFailure && !currentSpec) {
        setRuntimeSession(null);
      }

      const message =
        error instanceof Error ? error.message : "Could not restart the app runtime.";
      setRuntimeError(message);
      appendActivityItems([
        createAssistantActivity({
          kind: "error",
          tone: "error",
          title: "Runtime start failed.",
          detail: message,
          source: "runtime",
          relatedRuntimeId: previousRuntime?.runtimeId,
        }),
      ]);
      logBuilderEvent("runtime-restart-failed", "Runtime replacement flow failed.", {
        level: "error",
        runtimeId: previousRuntime?.runtimeId ?? null,
        error: message,
      });
      throw new Error(message);
    } finally {
      setIsRuntimeActionPending(false);
    }
  }, [appendActivityItems, currentSpec, logBuilderEvent, projectCreatedAt, projectId, resolveProjectMemory, runtimeSession]);

  const restoreProject = useCallback((project: PersistedProject) => {
    setProjectId(project.projectId);
    setProjectCreatedAt(project.createdAt);
    setPrompt(project.prompt || seedPrompt);
    setCurrentSpec(project.generatedSpec);
    setProjectMemory(project.projectMemory);
    setSelectedPreviewPageId(project.selectedPreviewPageId);
    setGenerationError(null);
    setRuntimeSession(null);
    setRuntimeLogs([]);
    setRuntimeError(null);
    setRestoredRuntimeIdToReconnect(project.lastRuntimeId ?? null);
    hasAttemptedRestoreRuntimeRef.current = false;
    appendActivityItems([
      createAssistantActivity({
        kind: "system-status",
        tone: "info",
        title: "Restored a saved local project.",
        detail: project.generatedSpec ? "The builder restored the latest prompt and generated app state." : "The builder restored the saved prompt state.",
        source: "builder",
      }),
    ]);
  }, [appendActivityItems]);

  useEffect(() => {
    reportedClientErrorSignaturesRef.current.clear();
  }, [runtimeSession?.runtimeId]);

  useEffect(() => {
    if (!runtimeSession) {
      previousRuntimeSessionRef.current = null;
      return;
    }

    updateStatusNoticeForRuntime(runtimeSession);

    const newRepairAttempts = (runtimeSession.repairAttempts ?? []).filter(
      (attempt) => !seenRepairAttemptIdsRef.current.has(attempt.attemptId),
    );

    appendActivityItems([
      ...deriveRuntimeStatusActivities(previousRuntimeSessionRef.current, runtimeSession),
      ...deriveRepairAttemptActivities(runtimeSession.repairAttempts ?? [], seenRepairAttemptIdsRef.current),
    ]);

    if (newRepairAttempts.length) {
      for (const attempt of newRepairAttempts) {
        commitProjectMemory((memory) => rememberRepairAttemptOutcome(memory, attempt), runtimeSession.projectId);
      }
    }

    previousRuntimeSessionRef.current = runtimeSession;
  }, [appendActivityItems, commitProjectMemory, runtimeSession, updateStatusNoticeForRuntime]);

  useEffect(() => {
    return () => {
      if (runtimePollRef.current) {
        window.clearInterval(runtimePollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const shouldPoll =
      runtimeSession?.runtimeId &&
      (runtimeSession.status === "preparing" || runtimeSession.status === "starting" || runtimeSession.status === "running");

    if (!shouldPoll) {
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

        if (snapshot.status !== "stopped") {
          const logs = await getRuntimeLogs(runtimeId);
          setRuntimeLogs(takeRecentRuntimeLogs(logs.entries));
        }

        if (snapshot.status !== "preparing" && snapshot.status !== "starting" && snapshot.status !== "running") {
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
  }, [requestedProjectId, restoreProject]);

  useEffect(() => {
    if (
      !hasHydratedPersistence ||
      hasAttemptedRestoreRuntimeRef.current ||
      !restoredRuntimeIdToReconnect
    ) {
      return;
    }

    hasAttemptedRestoreRuntimeRef.current = true;
    setIsRuntimeActionPending(true);

    void (async () => {
      try {
        const snapshot = await getRuntimeSnapshot(restoredRuntimeIdToReconnect);
        setRuntimeSession(snapshot);
        setRuntimeError(null);

        const logs = await getRuntimeLogs(restoredRuntimeIdToReconnect);
        setRuntimeLogs(takeRecentRuntimeLogs(logs.entries));

        appendActivityItems([
          createAssistantActivity({
            kind: "system-status",
            tone: "info",
            title: "Reconnected to the existing runtime.",
            detail:
              snapshot.status === "running"
                ? "The builder found the live preview from your last session and reattached to it."
                : "The builder reattached to the last known runtime instead of starting a new container.",
            source: "runtime",
            relatedRuntimeId: snapshot.runtimeId,
          }),
        ]);
        setSessionNotice(
          snapshot.status === "running"
            ? "Reconnected to your existing runtime."
            : "Reattached to the last known runtime session.",
        );
      } catch {
        setRuntimeSession(null);
        setRuntimeLogs([]);
        setRuntimeError(null);
        appendActivityItems([
          createAssistantActivity({
            kind: "system-status",
            tone: "info",
            title: "Saved project restored without auto-starting the runtime.",
            detail: "The previous runtime was not available, so the builder kept the saved app state and waited for an explicit Run app action.",
            source: "runtime",
          }),
        ]);
        setSessionNotice("Restored your local project. The previous runtime was unavailable, so no new runtime was started.");
      } finally {
        setRestoredRuntimeIdToReconnect(null);
        setIsRuntimeActionPending(false);
      }
    })();
  }, [appendActivityItems, hasHydratedPersistence, restoredRuntimeIdToReconnect]);

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
      const syncedMemory = {
        ...resolveProjectMemory(nextProjectId),
        projectState: {
          ...resolveProjectMemory(nextProjectId).projectState,
          ...summarizeRuntimeSessionForProjectMemory(runtimeSession),
        },
      };

      const snapshot: PersistedProject = {
        storageVersion: 1,
        projectId: nextProjectId,
        createdAt,
        updatedAt: now,
        lastOpenedAt: now,
        prompt,
        generatedSpec: currentSpec,
        lastRuntimeId: runtimeSession?.runtimeId ?? restoredRuntimeIdToReconnect ?? null,
        projectMemory: syncedMemory,
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
    resolveProjectMemory,
    restoredRuntimeIdToReconnect,
    runtimeSession,
    runtimeSession?.runtimeId,
    selectedPreviewPageId,
  ]);

  async function applyGenerationReadyResponse(
    generated: GenerationReadyResponse,
    mode: BuilderMode,
    currentPrompt: string,
    clarificationAnswers: ClarificationAnswer[] = [],
  ) {
    const { appSpec: generatedSpec, generationMeta } = generated;
    const previousSpec = currentSpec;
    const resolvedProjectId = projectId ?? runtimeSession?.projectId ?? null;
    const noOpMessage =
      mode === "edit" && previousSpec && !generated.directEdit
        ? getEditGenerationNoopMessage(previousSpec, generatedSpec, currentPrompt)
        : null;

    const commitGroundedResult = (
      result: ReturnType<typeof deriveGroundedBuildResult>,
      projectIdOverride?: string,
    ) => {
      const targetProjectId =
        projectIdOverride ?? result.projectId ?? resolvedProjectId ?? resolveProjectMemory().projectId;

      appendActivityItems([
        createAssistantResponseActivity(result.assistant.message, result.assistant.tone),
      ]);
      commitProjectMemory(
        (memory) =>
          rememberGroundedBuildResult(memory, {
            result,
          }),
        targetProjectId,
      );
      return result;
    };

    if (noOpMessage) {
      const groundedResult = commitGroundedResult(
        deriveGroundedBuildResult({
          projectId: resolvedProjectId,
          mode,
          userPrompt: currentPrompt,
          generationMeta,
          previousSpec,
          nextSpec: generatedSpec,
          noOpReason: noOpMessage,
        }),
      );
      setPendingClarification(null);
      setPrompt(currentPrompt);
      setSessionNotice(groundedResult.assistant.message);
      setGenerationError(null);
      logBuilderEvent("generation-noop", "Edit request produced no verified change.", {
        level: "warn",
        context: {
          mode,
        },
      });
      return;
    }

    const successNotice =
      generationMeta.source === "fallback"
        ? "OpenAI generation fell back to a safe baseline AppSpec."
        : mode === "edit"
          ? generationMeta.repaired
            ? "Updated the app and normalized it to fit the AppSpec contract."
            : "Updated the app."
          : generationMeta.repaired
            ? "Created the app and normalized it to fit the AppSpec contract."
            : "Created the app.";

    setPendingClarification(null);
    setPrompt(currentPrompt);

    let updateResult: RuntimeUpdateResult | null = null;
    if (mode === "edit" && runtimeSession?.runtimeId) {
      appendActivityItems([createHotUpdateAttemptActivity()]);

      try {
        logBuilderEvent("runtime-update-started", "Applying in-place runtime update.", {
          runtimeId: runtimeSession.runtimeId,
          context: {
            directEdit: Boolean(generated.directEdit),
          },
        });
        updateResult = await updateRuntime(runtimeSession.runtimeId, {
          generatedSpec,
          projectMemory: resolveProjectMemory(projectId ?? runtimeSession.projectId),
          directEdit: generated.directEdit,
        });

        if (!updateResult.fullRuntimeRestartRequired) {
          const nextPreviewModel = appSpecToPreviewModel(generatedSpec);
          setCurrentSpec(generatedSpec);
          setRuntimeSession(updateResult.session);
          setRuntimeError(null);
          setSessionNotice(
            updateResult.devServerRestarted
              ? "Applied the update and restarted the dev server inside the live container."
              : clarificationAnswers.length
                ? "Applied the clarified update in place and kept the runtime alive."
                : "Applied the update in place and kept the runtime alive.",
          );
          setSelectedPreviewPageId(
            nextPreviewModel.navigation.some((item) => item.pageId === selectedPreviewPageId)
              ? selectedPreviewPageId
              : (nextPreviewModel.navigation[0]?.pageId ?? null),
          );
          appendActivityItems([
            updateResult.devServerRestarted
              ? createDevServerRestartedActivity(updateResult.reason)
              : createHotUpdateAppliedActivity(updateResult.updatedPaths),
          ]);
          const groundedResult = commitGroundedResult(
            deriveGroundedBuildResult({
              projectId: updateResult.session.projectId,
              mode,
              userPrompt: currentPrompt,
              generationMeta,
              previousSpec,
              nextSpec: generatedSpec,
              updateResult,
            }),
            updateResult.session.projectId,
          );
          setSessionNotice(
            updateResult.devServerRestarted
              ? "Applied the update and restarted the dev server inside the live container."
              : clarificationAnswers.length
                ? "Applied the clarified update in place and kept the runtime alive."
                : "Applied the update in place and kept the runtime alive.",
          );
          setGenerationError(null);
          try {
            const logs = await getRuntimeLogs(updateResult.session.runtimeId);
            setRuntimeLogs(takeRecentRuntimeLogs(logs.entries));
          } catch {}
          if (generationMeta.source === "fallback") {
            setSessionNotice(`${successNotice} ${groundedResult.assistant.message}`);
          }
          logBuilderEvent("runtime-update-finished", "In-place runtime update completed.", {
            runtimeId: updateResult.session.runtimeId,
            context: {
              strategy: updateResult.strategyUsed,
              appliedPathCount: updateResult.appliedPaths.length,
              workspaceChangesApplied: updateResult.workspaceChangesApplied,
            },
          });
          return;
        }

        appendActivityItems([createContainerRestartRequiredActivity(updateResult.reason)]);
        logBuilderEvent("runtime-update-restart-required", "In-place update requires runtime restart.", {
          level: "warn",
          runtimeId: updateResult.session.runtimeId,
          context: {
            strategy: updateResult.strategyUsed,
          },
        });
      } catch (error) {
        logBuilderEvent("runtime-update-failed", "In-place runtime update failed.", {
          level: "error",
          runtimeId: runtimeSession.runtimeId,
          error: error instanceof Error ? error.message : "Unknown runtime update failure.",
        });
        appendActivityItems([
          createContainerRestartRequiredActivity(
            error instanceof Error ? error.message : "The in-place update failed, so the builder is falling back to a runtime restart.",
          ),
        ]);
      }
    }

    try {
      const restartedSession = await handleRestartRuntime(generatedSpec, {
        previousRuntimeSession: runtimeSession,
        preserveCurrentOnFailure: Boolean(currentSpec),
        directEdit: generated.directEdit,
        onSpecCommitted: (committedSpec) => {
          const nextPreviewModel = appSpecToPreviewModel(committedSpec);
          setCurrentSpec(committedSpec);
          setSelectedPreviewPageId(
            nextPreviewModel.navigation.some((item) => item.pageId === selectedPreviewPageId)
              ? selectedPreviewPageId
              : (nextPreviewModel.navigation[0]?.pageId ?? null),
          );
        },
        successNotice,
      });
      const groundedResult = commitGroundedResult(
        deriveGroundedBuildResult({
          projectId: restartedSession.projectId,
          mode,
          userPrompt: currentPrompt,
          generationMeta,
          previousSpec,
          nextSpec: generatedSpec,
          updateResult,
          restartedRuntimeSession: restartedSession,
          restartReason: updateResult?.reason ?? null,
        }),
        restartedSession.projectId,
      );
      setSessionNotice(successNotice);
      setGenerationError(null);
      if (generationMeta.source === "fallback") {
        setSessionNotice(`${successNotice} ${groundedResult.assistant.message}`);
      }
      logBuilderEvent("runtime-restart-finished", "Runtime restart flow completed.", {
        runtimeId: restartedSession.runtimeId,
        context: {
          status: restartedSession.status,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not restart the app runtime.";
      logBuilderEvent("runtime-restart-failed", "Runtime restart flow failed.", {
        level: "error",
        runtimeId: runtimeSession?.runtimeId ?? null,
        error: message,
      });
      setGenerationError(message);
      const groundedResult = commitGroundedResult(
        deriveGroundedBuildResult({
          projectId: resolvedProjectId,
          mode,
          userPrompt: currentPrompt,
          generationMeta,
          previousSpec,
          nextSpec: generatedSpec,
          updateResult,
          restartReason: updateResult?.reason ?? null,
          applyErrorMessage: message,
        }),
      );
      setSessionNotice(groundedResult.assistant.message);
    }
  }

  async function requestBuilderGeneration(
    currentPrompt: string,
    mode: BuilderMode,
    clarificationAnswers: ClarificationAnswer[] = [],
    memorySnapshot: ProjectBuildMemory,
  ) {
    logBuilderEvent("generate-started", "Submitting builder generate request.", {
      context: {
        mode,
        promptLength: currentPrompt.length,
        hasCurrentSpec: Boolean(currentSpec),
        hasRuntime: Boolean(runtimeSession?.runtimeId),
        clarificationCount: clarificationAnswers.length,
      },
    });
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: currentPrompt,
        mode,
        currentSpec: mode === "edit" ? currentSpec : undefined,
        runtimeId: mode === "edit" ? runtimeSession?.runtimeId : undefined,
        clarificationAnswers,
        projectMemory: memorySnapshot,
      }),
    });
    const payload = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : "The server could not generate a valid app spec.";

      throw new Error(message);
    }

    const parsedResponse = builderGenerateResponseSchema.safeParse(payload);

    if (!parsedResponse.success) {
      throw new Error("The server returned an invalid builder response payload.");
    }

    if (parsedResponse.data.status === "clarification_required") {
      logBuilderEvent("generate-clarification", "Builder requested clarification.", {
        context: {
          mode,
          questionCount: parsedResponse.data.clarification.questions.length,
        },
      });
      setPendingClarification({
        prompt: currentPrompt,
        mode,
        questions: parsedResponse.data.clarification.questions,
      });
      appendActivityItems([
        createClarificationQuestionsActivity(
          parsedResponse.data.assistantMessage,
          parsedResponse.data.clarification.questions,
        ),
      ]);
      setSessionNotice("Answer the clarification questions so the builder can proceed.");
      return;
    }

    logBuilderEvent("generate-ready", "Builder returned a generation-ready result.", {
      context: {
        mode,
        directEdit: Boolean(parsedResponse.data.directEdit),
        changeStatus: parsedResponse.data.changeStatus,
      },
    });
    await applyGenerationReadyResponse(parsedResponse.data, mode, currentPrompt, clarificationAnswers);
  }

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
    setPendingClarification(null);
    appendActivityItems([createUserPromptActivity(trimmedPrompt)]);

    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const mode = resolveBuilderMode(currentSpec);
      const memorySnapshot = commitProjectMemory((memory) =>
        rememberPromptSubmission(memory, {
          prompt: trimmedPrompt,
          mode,
        }),
      );
      await requestBuilderGeneration(trimmedPrompt, mode, [], memorySnapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The builder could not apply that app update.";
      logBuilderEvent("submit-failed", "Builder submit flow failed.", {
        level: "error",
        context: {
          mode: resolveBuilderMode(currentSpec),
        },
        error: message,
      });
      setGenerationError(message);
      appendActivityItems([createGenerationFailedActivity(message)]);
      commitProjectMemory((memory) =>
        rememberGenerationFailure(memory, {
          mode: resolveBuilderMode(currentSpec),
          message,
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClarificationSubmit(answers: ClarificationAnswer[]) {
    if (!pendingClarification) {
      return;
    }

    setIsLoading(true);
    setGenerationError(null);
    appendActivityItems([createClarificationAnswersActivity(answers)]);

    try {
      const memorySnapshot = commitProjectMemory((memory) =>
        rememberClarificationAnswers(memory, {
          prompt: pendingClarification.prompt,
          answers,
        }),
      );
      await requestBuilderGeneration(pendingClarification.prompt, pendingClarification.mode, answers, memorySnapshot);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The builder still needs more specific detail before it can continue.";
      logBuilderEvent("clarification-submit-failed", "Clarification submit flow failed.", {
        level: "error",
        context: {
          mode: pendingClarification.mode,
        },
        error: message,
      });
      setGenerationError(message);
      appendActivityItems([createGenerationFailedActivity(message)]);
      commitProjectMemory((memory) =>
        rememberGenerationFailure(memory, {
          mode: pendingClarification.mode,
          message,
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartRuntime() {
    if (!effectiveSpec) {
      return;
    }

    logBuilderEvent("runtime-start-requested", "User requested runtime start.");
    await handleRestartRuntime(effectiveSpec, {
      previousRuntimeSession: runtimeSession,
      preserveCurrentOnFailure: true,
      successNotice: "Started the runtime.",
    });
  }

  async function handleStopRuntime() {
    if (!runtimeSession?.runtimeId) {
      return;
    }

    logBuilderEvent("runtime-stop-requested", "User requested runtime stop.", {
      runtimeId: runtimeSession.runtimeId,
    });
    setIsRuntimeActionPending(true);
    appendActivityItems([createRuntimeActionActivity("stop")]);

    try {
      const stoppedSession = await stopRuntime(runtimeSession.runtimeId);
      setRuntimeSession(stoppedSession);
      logBuilderEvent("runtime-stop-finished", "Runtime stop completed.", {
        runtimeId: stoppedSession.runtimeId,
        context: {
          status: stoppedSession.status,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not stop live runtime preview.";
      logBuilderEvent("runtime-stop-failed", "Runtime stop failed.", {
        level: "error",
        runtimeId: runtimeSession.runtimeId,
        error: message,
      });
      setRuntimeError(message);
      appendActivityItems([
        createAssistantActivity({
          kind: "error",
          tone: "error",
          title: "Runtime stop failed.",
          detail: message,
          source: "runtime",
          relatedRuntimeId: runtimeSession.runtimeId,
        }),
      ]);
    } finally {
      setIsRuntimeActionPending(false);
    }
  }

  async function handleClientRuntimeError(report: BrowserRuntimeErrorReport) {
    if (!runtimeSession?.runtimeId) {
      return;
    }

    const signature = [runtimeSession.runtimeId, report.source, report.message, report.stack ?? ""].join("|");

    if (reportedClientErrorSignaturesRef.current.has(signature)) {
      return;
    }

    reportedClientErrorSignaturesRef.current.add(signature);
    setRuntimeError(`Browser runtime error: ${report.message}`);
    appendActivityItems([
      createBrowserRuntimeErrorActivity(report, runtimeSession.runtimeId),
      createRepairStartedActivity(runtimeSession.runtimeId, "The repair loop will try to recover the preview using bounded app-file changes."),
    ]);
    logBuilderEvent("browser-runtime-error", "Browser runtime error reported from preview.", {
      level: "error",
      runtimeId: runtimeSession.runtimeId,
      error: report.message,
      context: {
        source: report.source,
      },
    });

    try {
      const nextSession = await reportClientRuntimeError(runtimeSession.runtimeId, report);
      setRuntimeSession(nextSession);
      const logs = await getRuntimeLogs(runtimeSession.runtimeId);
      setRuntimeLogs(takeRecentRuntimeLogs(logs.entries));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not report browser runtime error.";
      setRuntimeError(message);
      appendActivityItems([
        createAssistantActivity({
          kind: "error",
          tone: "error",
          title: "Could not process the browser runtime error.",
          detail: message,
          source: "browser",
          relatedRuntimeId: runtimeSession.runtimeId,
        }),
      ]);
    }
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[var(--color-canvas)] px-3 py-3 lg:px-4">
      <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(280px,20vw)_minmax(0,1fr)]">
        <aside className="grid min-h-0 overflow-hidden gap-3 lg:grid-rows-[minmax(0,1fr)_auto]">
          <ChatHistoryPanel items={activityItems} />

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
                  {pendingClarification ? "Continuing with the clarified request..." : "Reviewing the prompt and planning the build..."}
                </div>
              ) : null}

              {!pendingClarification ? (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-ink-soft)] disabled:cursor-not-allowed disabled:bg-[var(--color-muted)]"
                >
                  {isLoading ? "Working..." : hasSpec ? "Update app" : "Create app"}
                </button>
              ) : null}
            </form>

            {pendingClarification ? (
              <ClarificationForm
                key={pendingClarification.questions.map((question) => question.id).join("|")}
                questions={pendingClarification.questions}
                disabled={isLoading}
                onSubmit={async (answers) => {
                  await handleClarificationSubmit(answers);
                }}
              />
            ) : null}
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
                onRestart={() => {
                  if (effectiveSpec) {
                    void handleRestartRuntime(effectiveSpec, {
                      previousRuntimeSession: runtimeSession,
                      preserveCurrentOnFailure: true,
                      successNotice: "Restarted the runtime.",
                    });
                  }
                }}
                onStop={() => void handleStopRuntime()}
                onClientRuntimeError={(report) => {
                  void handleClientRuntimeError(report);
                }}
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
