import { randomUUID } from "node:crypto";

import { generateFixBundleFromDiagnostic as defaultGenerateFixBundleFromDiagnostic } from "@/lib/codegen/fixes/generate-fix-bundle";
import type { DiagnosticArtifact } from "@/lib/runtime/diagnostics/diagnostic-artifact";
import { generationPipeline, type GenerationPipeline } from "@/lib/generation/pipeline";
import type { Runner } from "@/lib/runtime/contracts";
import type { RuntimeFailure, RuntimeLogEntry } from "@/lib/runtime/logs";
import { buildDiagnosticArtifact } from "@/lib/runtime/diagnostics/build-diagnostic";
import { inspectRuntimeFailure } from "@/lib/runtime/inspection/inspect-runtime";
import { DockerRunner } from "@/lib/runtime/runners/docker/docker-runner";
import type {
  BrowserRuntimeErrorReport,
  RuntimeLogPage,
  RuntimeRepairAttempt,
  RuntimeSession,
  StartRuntimeInput,
  RuntimeUpdateResult,
  UpdateRuntimeInput,
} from "@/lib/runtime/service/dto";
import { RuntimeServiceNotFoundError, type RuntimeService } from "@/lib/runtime/service/runtime-service";
import { InMemoryRuntimeSessionStore } from "@/lib/runtime/store/in-memory-runtime-store";
import type { RuntimeSessionRecord, RuntimeSessionStore } from "@/lib/runtime/store/runtime-session-store";
import { applyWorkspaceEditChangeSet } from "@/lib/builder/edits/apply-change-set";
import { deriveWorkspaceEditChangeSet } from "@/lib/builder/edits/derive-change-set";
import { validateWorkspaceEditChangeSet } from "@/lib/builder/edits/validate-change-set";
import { diffWorkspaceFiles, verifyObservedFileDiffs } from "@/lib/builder/verification/code-diff";
import { applyFixBundleToWorkspacePlan } from "@/lib/workspace/fixes/apply-fix-bundle";
import { applyWorkspaceFileUpdatesToLocalFs, readWorkspaceFilesFromLocalFs } from "@/lib/workspace/materializers/local-fs";
import type { WorkspaceFile } from "@/lib/workspace/model";
import { applyWorkspaceFileUpdates } from "@/lib/workspace/updates/apply-workspace-file-update";
import { classifyRuntimeUpdate } from "@/lib/workspace/updates/classify-runtime-update";

const maxAutoFixAttempts = 2;
const devServerControlPaths = [
  ".appdesigner/runtime/container-entrypoint.sh",
  ".appdesigner/runtime/start-dev-server.sh",
  ".appdesigner/runtime/stop-dev-server.sh",
  ".appdesigner/runtime/restart-dev-server.sh",
  ".appdesigner/runtime/dev-server-status.sh",
] as const;

function nowIso() {
  return new Date().toISOString();
}

function toPublicSession(session: RuntimeSessionRecord): RuntimeSession {
  return {
    runtimeId: session.runtimeId,
    projectId: session.projectId,
    workspaceId: session.workspaceId,
    sourceSpecId: session.sourceSpecId,
    status: session.status,
    previewUrl: session.previewUrl,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    failure: session.failure,
    repairAttempts: session.repairAttempts,
  };
}

function createFailure(code: RuntimeFailure["code"], error: unknown, fallbackMessage: string): RuntimeFailure {
  const message = error instanceof Error ? error.message : fallbackMessage;

  return {
    code,
    message,
  };
}

function isPortBindingError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return message.includes("port is already allocated") || message.includes("bind") || message.includes("address already in use");
}

function hasDevServerControls(session: RuntimeSessionRecord) {
  const files = session.workspace?.files ?? session.workspacePlan?.files ?? [];
  const paths = new Set(files.map((file) => file.path));
  return devServerControlPaths.every((path) => paths.has(path));
}

function overlayDirectEditFiles(
  files: WorkspaceFile[],
  directEditFiles: Array<{ path: string; kind: "source" | "config" | "asset"; content: string }>,
) {
  return applyWorkspaceFileUpdates(
    files,
    directEditFiles.map((file) => ({
      action: "upsert" as const,
      path: file.path,
      kind: file.kind,
      content: file.content,
    })),
  );
}

export class LocalRuntimeService implements RuntimeService {
  constructor(
    private readonly runner: Runner = new DockerRunner(),
    private readonly store: RuntimeSessionStore = new InMemoryRuntimeSessionStore(),
    private readonly pipeline: GenerationPipeline = generationPipeline,
    private readonly generateFixBundle: (diagnostic: DiagnosticArtifact) => ReturnType<typeof defaultGenerateFixBundleFromDiagnostic> =
      defaultGenerateFixBundleFromDiagnostic,
  ) {}

  async startProjectRuntime(input: StartRuntimeInput) {
    const runtimeId = randomUUID();
    const createdAt = nowIso();
    const initialSession: RuntimeSessionRecord = {
      runtimeId,
      projectId: input.projectId,
      workspaceId: "",
      sourceSpecId: input.generatedSpec.appId,
      status: "preparing",
      createdAt,
      updatedAt: createdAt,
      repairAttempts: [],
    };

    this.store.save(initialSession);

    try {
      const baseWorkspacePlan = await this.pipeline.planWorkspace(input.generatedSpec, input.projectId, input.projectMemory);
      const workspacePlan = input.directEdit?.files?.length
        ? {
            ...baseWorkspacePlan,
            files: overlayDirectEditFiles(baseWorkspacePlan.files, input.directEdit.files),
          }
        : baseWorkspacePlan;
      const workspace = await this.pipeline.materializeWorkspace(workspacePlan);
      const target = await this.pipeline.createRuntimeTarget(workspace);

      this.store.update(runtimeId, {
        workspaceId: workspace.workspaceId,
        previewUrl: target.previewUrl,
        target,
        workspacePlan,
        workspace,
        updatedAt: nowIso(),
      });

      return toPublicSession(await this.startWithRepairLoop(runtimeId));
    } catch (error) {
      return toPublicSession(
        this.requireSession(
          this.store.update(runtimeId, {
            status: "failed",
            updatedAt: nowIso(),
            failure: createFailure("workspace_missing", error, "The workspace could not be prepared."),
          }),
          runtimeId,
        ),
      );
    }
  }

  async updateProjectRuntime(runtimeId: string, input: UpdateRuntimeInput): Promise<RuntimeUpdateResult> {
    const session = this.requireSession(this.store.get(runtimeId), runtimeId);

    if (!session.workspacePlan || !session.workspace) {
      return {
        session: toPublicSession(session),
        strategyUsed: "full-runtime-restart-required",
        devServerRestarted: false,
        fullRuntimeRestartRequired: true,
        workspaceChangesApplied: false,
        attemptedPaths: [],
        appliedPaths: [],
        updatedPaths: [],
        reason: "The current runtime does not have a materialized workspace to update in place.",
      };
    }

    const baseNextPlan = await this.pipeline.planWorkspace(input.generatedSpec, session.projectId, input.projectMemory);
    const nextPlan = input.directEdit?.files?.length
      ? {
          ...session.workspacePlan,
          sourceSpecId: input.generatedSpec.appId,
          title: baseNextPlan.title,
          files: overlayDirectEditFiles(session.workspacePlan.files, input.directEdit.files),
          generationContext: baseNextPlan.generationContext,
        }
      : baseNextPlan;
    const classification = classifyRuntimeUpdate(session.workspacePlan, nextPlan);
    const editChangeSet = deriveWorkspaceEditChangeSet(session.workspacePlan, nextPlan, runtimeId);
    const editValidation = validateWorkspaceEditChangeSet(session.workspace.files, editChangeSet);
    const generatedFileDiffs = diffWorkspaceFiles(
      session.workspacePlan.files,
      nextPlan.files,
      editChangeSet.operations.map((operation) => operation.path),
    );

    if (!editValidation.valid) {
      return {
        session: toPublicSession(session),
        strategyUsed: "full-runtime-restart-required",
        devServerRestarted: false,
        fullRuntimeRestartRequired: true,
        workspaceChangesApplied: false,
        attemptedPaths: editChangeSet.operations.map((operation) => operation.path),
        appliedPaths: [],
        updatedPaths: editChangeSet.operations.map((operation) => operation.path),
        editChangeSet: {
          changeSetId: editChangeSet.changeSetId,
          summary: editChangeSet.summary,
          operationPaths: editChangeSet.operations.map((operation) => operation.path),
          rejectedPaths: editValidation.rejectedPaths,
        },
        codeVerification: {
          generatedPaths: generatedFileDiffs.map((diff) => diff.path),
          generatedFileDiffs,
          finalPathsChecked: [],
          observedDiffs: [],
          landedPaths: [],
          missingPaths: generatedFileDiffs.map((diff) => diff.path),
          overwrittenPaths: [],
          unchangedPaths: [],
        },
        reason: editValidation.issues.join(" "),
      };
    }

    if (classification.strategyUsed === "full-runtime-restart-required") {
      return {
        session: toPublicSession(session),
        strategyUsed: classification.strategyUsed,
        devServerRestarted: false,
        fullRuntimeRestartRequired: true,
        workspaceChangesApplied: false,
        attemptedPaths: editValidation.validatedPaths,
        appliedPaths: [],
        updatedPaths: editValidation.validatedPaths,
        editChangeSet: {
          changeSetId: editChangeSet.changeSetId,
          summary: editChangeSet.summary,
          operationPaths: editChangeSet.operations.map((operation) => operation.path),
          rejectedPaths: [],
        },
        codeVerification: {
          generatedPaths: generatedFileDiffs.map((diff) => diff.path),
          generatedFileDiffs,
          finalPathsChecked: [],
          observedDiffs: [],
          landedPaths: [],
          missingPaths: generatedFileDiffs.map((diff) => diff.path),
          overwrittenPaths: [],
          unchangedPaths: [],
        },
        reason: classification.reason,
      };
    }

    const appliedEdit = applyWorkspaceEditChangeSet(session.workspace.files, editChangeSet);
    const nextWorkspace = await applyWorkspaceFileUpdatesToLocalFs(session.workspace, appliedEdit.updates);
    const finalObservedFiles = await readWorkspaceFilesFromLocalFs(nextWorkspace, appliedEdit.changedPaths);
    const observedDiffs = verifyObservedFileDiffs(
      session.workspace.files,
      nextPlan.files,
      finalObservedFiles,
      appliedEdit.changedPaths,
    );
    const codeVerification = {
      generatedPaths: generatedFileDiffs.map((diff) => diff.path),
      generatedFileDiffs,
      finalPathsChecked: appliedEdit.changedPaths,
      observedDiffs,
      landedPaths: observedDiffs.filter((diff) => diff.landingStatus === "landed").map((diff) => diff.path),
      missingPaths: observedDiffs.filter((diff) => diff.landingStatus === "missing").map((diff) => diff.path),
      overwrittenPaths: observedDiffs.filter((diff) => diff.landingStatus === "overwritten").map((diff) => diff.path),
      unchangedPaths: observedDiffs.filter((diff) => diff.landingStatus === "unchanged").map((diff) => diff.path),
    };
    const nextPlanFiles = applyWorkspaceFileUpdates(session.workspacePlan.files, classification.updates);
    const nextPlanState = {
      ...session.workspacePlan,
      sourceSpecId: input.generatedSpec.appId,
      title: nextPlan.title,
      files: nextPlanFiles,
      generationContext: nextPlan.generationContext,
    };

    const nextSession = this.requireSession(
      this.store.update(runtimeId, {
        sourceSpecId: input.generatedSpec.appId,
        workspacePlan: nextPlanState,
        workspace: {
          ...nextWorkspace,
          sourceSpecId: input.generatedSpec.appId,
          title: nextPlan.title,
          generationContext: nextPlan.generationContext,
        },
        updatedAt: nowIso(),
        failure: undefined,
      }),
      runtimeId,
    );

    if (!nextSession.handle) {
      return {
        session: toPublicSession(nextSession),
        strategyUsed: "full-runtime-restart-required",
        devServerRestarted: false,
        fullRuntimeRestartRequired: true,
        workspaceChangesApplied: true,
        attemptedPaths: editValidation.validatedPaths,
        appliedPaths: appliedEdit.changedPaths,
        updatedPaths: appliedEdit.changedPaths,
        editChangeSet: {
          changeSetId: editChangeSet.changeSetId,
          summary: editChangeSet.summary,
          operationPaths: editChangeSet.operations.map((operation) => operation.path),
          rejectedPaths: [],
        },
        codeVerification,
        reason: "The live container is not available, so the runtime must be started again.",
      };
    }

    const runtimeStatus = await this.runner.getStatus(nextSession.handle);

    if (runtimeStatus === "running" || runtimeStatus === "starting") {
      return {
        session: toPublicSession(
          this.requireSession(
            this.store.update(runtimeId, {
              status: runtimeStatus,
              updatedAt: nowIso(),
            }),
            runtimeId,
          ),
        ),
        strategyUsed: "hot-update",
        devServerRestarted: false,
        fullRuntimeRestartRequired: false,
        workspaceChangesApplied: true,
        attemptedPaths: editValidation.validatedPaths,
        appliedPaths: appliedEdit.changedPaths,
        updatedPaths: appliedEdit.changedPaths,
        editChangeSet: {
          changeSetId: editChangeSet.changeSetId,
          summary: editChangeSet.summary,
          operationPaths: editChangeSet.operations.map((operation) => operation.path),
          rejectedPaths: [],
        },
        codeVerification,
      };
    }

    if (!hasDevServerControls(nextSession)) {
      return {
        session: toPublicSession(nextSession),
        strategyUsed: "full-runtime-restart-required",
        devServerRestarted: false,
        fullRuntimeRestartRequired: true,
        workspaceChangesApplied: true,
        attemptedPaths: editValidation.validatedPaths,
        appliedPaths: appliedEdit.changedPaths,
        updatedPaths: appliedEdit.changedPaths,
        editChangeSet: {
          changeSetId: editChangeSet.changeSetId,
          summary: editChangeSet.summary,
          operationPaths: editChangeSet.operations.map((operation) => operation.path),
          rejectedPaths: [],
        },
        codeVerification,
        reason: "This runtime was started before dev-server process controls were available inside the container.",
      };
    }

    try {
      await this.runner.restartDevServer(nextSession.handle);
      const restartedSession = this.requireSession(
        this.store.update(runtimeId, {
          status: "running",
          updatedAt: nowIso(),
          failure: undefined,
        }),
        runtimeId,
      );

      return {
        session: toPublicSession(restartedSession),
        strategyUsed: "dev-server-restart",
        devServerRestarted: true,
        fullRuntimeRestartRequired: false,
        workspaceChangesApplied: true,
        attemptedPaths: editValidation.validatedPaths,
        appliedPaths: appliedEdit.changedPaths,
        updatedPaths: appliedEdit.changedPaths,
        editChangeSet: {
          changeSetId: editChangeSet.changeSetId,
          summary: editChangeSet.summary,
          operationPaths: editChangeSet.operations.map((operation) => operation.path),
          rejectedPaths: [],
        },
        codeVerification,
        reason: "Hot reload was not enough, so the dev server was restarted inside the existing container.",
      };
    } catch (error) {
      return {
        session: toPublicSession(
          this.requireSession(
            this.store.update(runtimeId, {
              status: "failed",
              updatedAt: nowIso(),
              failure: createFailure("container_start_failed", error, "The dev server could not be restarted inside the container."),
            }),
            runtimeId,
          ),
        ),
        strategyUsed: "full-runtime-restart-required",
        devServerRestarted: false,
        fullRuntimeRestartRequired: true,
        workspaceChangesApplied: true,
        attemptedPaths: editValidation.validatedPaths,
        appliedPaths: appliedEdit.changedPaths,
        updatedPaths: appliedEdit.changedPaths,
        editChangeSet: {
          changeSetId: editChangeSet.changeSetId,
          summary: editChangeSet.summary,
          operationPaths: editChangeSet.operations.map((operation) => operation.path),
          rejectedPaths: [],
        },
        codeVerification,
        reason:
          error instanceof Error
            ? error.message
            : "The dev server restart failed, so a full runtime restart is required.",
      };
    }

  }

  async getRuntimeSnapshot(runtimeId: string) {
    const session = this.requireSession(this.store.get(runtimeId), runtimeId);

    if (!session.handle) {
      return toPublicSession(session);
    }

    const status = await this.runner.getStatus(session.handle);
    const nextSession = this.requireSession(
      this.store.update(runtimeId, {
        status: status === "idle" ? session.status : status,
        updatedAt: nowIso(),
      }),
      runtimeId,
    );

    return toPublicSession(nextSession);
  }

  async getRuntimeLogs(runtimeId: string): Promise<RuntimeLogPage> {
    const session = this.requireSession(this.store.get(runtimeId), runtimeId);

    if (!session.handle) {
      return {
        runtimeId,
        entries: session.browserLogs ?? [],
      };
    }

    const runnerLogs = await this.runner.getLogs(session.handle);

    return {
      runtimeId,
      entries: [...runnerLogs, ...(session.browserLogs ?? [])],
    };
  }

  async reportClientRuntimeError(runtimeId: string, report: BrowserRuntimeErrorReport) {
    const session = this.requireSession(this.store.get(runtimeId), runtimeId);
    const browserLogs = [...(session.browserLogs ?? []), ...this.toBrowserLogEntries(report)];
    const updatedSession = this.requireSession(
      this.store.update(runtimeId, {
        browserLogs,
        updatedAt: nowIso(),
      }),
      runtimeId,
    );

    if (
      !updatedSession.workspace ||
      !updatedSession.workspacePlan ||
      !(updatedSession.workspace.generationContext ?? updatedSession.workspacePlan.generationContext)
    ) {
      return toPublicSession(updatedSession);
    }

    if (updatedSession.handle) {
      await this.runner.stop(updatedSession.handle).catch(() => undefined);
    }

    const { attemptCount, seenFailureSignatures } = getCurrentRepairCycleState(updatedSession.repairAttempts ?? []);
    const failure: RuntimeFailure = {
      code: "client_runtime_failed",
      message: report.message,
      details: [report.href, report.componentStack, report.stack].filter(Boolean).join("\n\n") || undefined,
    };

    const repairOutcome = await this.handleRepairableFailure({
      runtimeId,
      failure,
      logs: browserLogs,
      fixAttemptCount: attemptCount,
      seenFailureSignatures,
    });

    if (!repairOutcome.repaired) {
      return toPublicSession(repairOutcome.session);
    }

    return toPublicSession(await this.startWithRepairLoop(runtimeId, attemptCount + 1, seenFailureSignatures, repairOutcome.pendingAttempt));
  }

  async requestDevServerControl(
    runtimeId: string,
    requestedStrategy: "hot-update" | "dev-server-restart" | "full-runtime-restart-required",
  ) {
    const session = this.requireSession(this.store.get(runtimeId), runtimeId);

    if (!session.handle) {
      return {
        strategyUsed: "full-runtime-restart-required" as const,
        summary: "The live container is unavailable, so a full runtime restart is required.",
      };
    }

    if (requestedStrategy === "full-runtime-restart-required") {
      return {
        strategyUsed: "full-runtime-restart-required" as const,
        summary: "The requested change requires a full runtime restart.",
      };
    }

    if (requestedStrategy === "hot-update") {
      const status = await this.runner.getStatus(session.handle);
      return {
        strategyUsed: status === "running" || status === "starting" ? "hot-update" as const : "full-runtime-restart-required" as const,
        summary:
          status === "running" || status === "starting"
            ? "The runtime stayed up and is ready for hot reload."
            : "Hot reload was not available, so a full runtime restart is required.",
      };
    }

    if (!hasDevServerControls(session)) {
      return {
        strategyUsed: "full-runtime-restart-required" as const,
        summary: "This runtime does not expose in-container dev-server controls, so a full restart is required.",
      };
    }

    await this.runner.restartDevServer(session.handle);
    this.store.update(runtimeId, {
      status: "running",
      updatedAt: nowIso(),
      failure: undefined,
    });

    return {
      strategyUsed: "dev-server-restart" as const,
      summary: "Restarted the dev server inside the existing container.",
    };
  }

  getRuntimeWorkspaceFiles(runtimeId: string) {
    const session = this.requireSession(this.store.get(runtimeId), runtimeId);
    const files = session.workspace?.files ?? session.workspacePlan?.files ?? [];

    return {
      runtimeId: session.runtimeId,
      projectId: session.projectId,
      workspaceId: session.workspaceId,
      files,
    };
  }

  async stopProjectRuntime(runtimeId: string) {
    const session = this.requireSession(this.store.get(runtimeId), runtimeId);

    if (session.handle) {
      await this.runner.stop(session.handle);
    }

    const nextSession = this.requireSession(
      this.store.update(runtimeId, {
        status: "stopped",
        updatedAt: nowIso(),
      }),
      runtimeId,
    );

    return toPublicSession(nextSession);
  }

  private requireSession(session: RuntimeSessionRecord | null, runtimeId: string) {
    if (!session) {
      throw new RuntimeServiceNotFoundError(runtimeId);
    }

    return session;
  }

  private async startWithRepairLoop(
    runtimeId: string,
    initialFixAttemptCount = 0,
    initialSeenFailureSignatures = new Set<string>(),
    initialPendingAttempt?:
      | {
          attemptId: string;
          failureKind: RuntimeRepairAttempt["failureKind"];
          failureSignature: string;
          startedAt: string;
          logExcerpt: string;
          diagnosticSummary: string;
          modifiedFiles: string[];
          provider?: RuntimeRepairAttempt["provider"];
          repaired: boolean;
        }
      | undefined,
  ): Promise<RuntimeSessionRecord> {
    const seenFailureSignatures = new Set(initialSeenFailureSignatures);
    let fixAttemptCount = initialFixAttemptCount;
    let pendingAttempt = initialPendingAttempt;

    while (true) {
      const session = this.requireSession(this.store.get(runtimeId), runtimeId);
      const target = session.target;
      const workspace = session.workspace;
      const workspacePlan = session.workspacePlan;

      if (!target || !workspace || !workspacePlan) {
        return this.requireSession(
          this.store.update(runtimeId, {
            status: "failed",
            updatedAt: nowIso(),
            failure: {
              code: "workspace_missing",
              message: "The workspace context required for repair was missing.",
            },
          }),
          runtimeId,
        );
      }

      try {
        await this.runner.prepare(target);
      } catch (error) {
        const failure = createFailure("image_build_failed", error, "Docker image build failed.");
        const logs = await this.runner.getPreparationLogs(target);
        const outcome = await this.handleRepairableFailure({
          runtimeId,
          failure,
          logs,
          fixAttemptCount,
          seenFailureSignatures,
          pendingAttempt,
        });

        if (!outcome.repaired) {
          return outcome.session;
        }

        fixAttemptCount += 1;
        pendingAttempt = outcome.pendingAttempt;
        continue;
      }

      this.store.update(runtimeId, {
        status: "starting",
        updatedAt: nowIso(),
      });

      try {
        let handle;

        try {
          handle = await this.runner.start(target);
        } catch (error) {
          if (!isPortBindingError(error)) {
            throw error;
          }

          const nextTarget = await this.pipeline.createRuntimeTarget(workspace);
          this.store.update(runtimeId, {
            previewUrl: nextTarget.previewUrl,
            target: nextTarget,
            updatedAt: nowIso(),
          });
          handle = await this.runner.start(nextTarget);
        }

        const status = await this.runner.getStatus(handle);
        const nextSession = this.requireSession(
          this.store.update(runtimeId, {
            handle,
            status: status === "idle" ? "starting" : status,
            updatedAt: nowIso(),
          }),
          runtimeId,
        );

        if (!pendingAttempt) {
          return nextSession;
        }

        return this.requireSession(
          this.store.update(runtimeId, {
            repairAttempts: [
              ...(nextSession.repairAttempts ?? []),
              {
                attemptId: pendingAttempt.attemptId,
                runtimeId,
                workspaceId: nextSession.workspaceId,
                failureKind: pendingAttempt.failureKind,
                failureSignature: pendingAttempt.failureSignature,
                status: "fixed",
                startedAt: pendingAttempt.startedAt,
                finishedAt: nowIso(),
                logExcerpt: pendingAttempt.logExcerpt,
                diagnosticSummary: pendingAttempt.diagnosticSummary,
                modifiedFiles: pendingAttempt.modifiedFiles,
                provider: pendingAttempt.provider,
                repaired: pendingAttempt.repaired,
              },
            ],
          }),
          runtimeId,
        );
      } catch (error) {
        const failure = createFailure(
          isPortBindingError(error) ? "port_binding_failed" : "container_start_failed",
          error,
          "Docker container failed to start.",
        );

        const outcome = await this.handleRepairableFailure({
          runtimeId,
          failure,
          logs: [],
          fixAttemptCount,
          seenFailureSignatures,
          pendingAttempt,
        });

        if (!outcome.repaired) {
          return outcome.session;
        }

        fixAttemptCount += 1;
        pendingAttempt = outcome.pendingAttempt;
      }
    }
  }

  private async handleRepairableFailure(input: {
    runtimeId: string;
    failure: RuntimeFailure;
    logs: RuntimeLogEntry[];
    fixAttemptCount: number;
    seenFailureSignatures: Set<string>;
    pendingAttempt?:
      | {
          attemptId: string;
          failureKind: RuntimeRepairAttempt["failureKind"];
          failureSignature: string;
          startedAt: string;
          logExcerpt: string;
          diagnosticSummary: string;
          modifiedFiles: string[];
          provider?: RuntimeRepairAttempt["provider"];
          repaired: boolean;
        }
      | undefined;
  }): Promise<{
    repaired: boolean;
    pendingAttempt?: {
      attemptId: string;
      failureKind: RuntimeRepairAttempt["failureKind"];
      failureSignature: string;
      startedAt: string;
      logExcerpt: string;
      diagnosticSummary: string;
      modifiedFiles: string[];
      provider?: RuntimeRepairAttempt["provider"];
      repaired: boolean;
    };
    session: RuntimeSessionRecord;
  }> {
    const session = this.requireSession(this.store.get(input.runtimeId), input.runtimeId);
    const workspace = session.workspace;
    const workspacePlan = session.workspacePlan;
    const generationContext = workspace?.generationContext ?? workspacePlan?.generationContext;
    const existingAttempts = session.repairAttempts ?? [];

    const finalizedAttempts = input.pendingAttempt
      ? [
          ...existingAttempts,
          {
            attemptId: input.pendingAttempt.attemptId,
            runtimeId: input.runtimeId,
            workspaceId: session.workspaceId,
            failureKind: input.pendingAttempt.failureKind,
            failureSignature: input.pendingAttempt.failureSignature,
            status: "failed" as const,
            startedAt: input.pendingAttempt.startedAt,
            finishedAt: nowIso(),
            logExcerpt: input.pendingAttempt.logExcerpt,
            diagnosticSummary: input.pendingAttempt.diagnosticSummary,
            modifiedFiles: input.pendingAttempt.modifiedFiles,
            provider: input.pendingAttempt.provider,
            repaired: input.pendingAttempt.repaired,
          },
        ]
      : existingAttempts;

    if (!workspace || !workspacePlan || !generationContext) {
      return {
        repaired: false,
        session: this.requireSession(
          this.store.update(input.runtimeId, {
            status: "failed",
            updatedAt: nowIso(),
            failure: input.failure,
            repairAttempts: finalizedAttempts,
          }),
          input.runtimeId,
        ),
      };
    }

    const inspection = inspectRuntimeFailure({
      session,
      workspace,
      failure: input.failure,
      logs: input.logs,
      attemptNumber: input.fixAttemptCount + 1,
    });

    const shouldStop =
      input.fixAttemptCount >= maxAutoFixAttempts || input.seenFailureSignatures.has(inspection.failureSignature);

    if (shouldStop) {
      return {
        repaired: false,
        session: this.requireSession(
          this.store.update(input.runtimeId, {
            status: "failed",
            updatedAt: nowIso(),
            failure: input.failure,
            repairAttempts: [
              ...finalizedAttempts,
              {
                attemptId: randomUUID(),
                runtimeId: input.runtimeId,
                workspaceId: session.workspaceId,
                failureKind: inspection.failureKind,
                failureSignature: inspection.failureSignature,
                status: "aborted",
                startedAt: nowIso(),
                finishedAt: nowIso(),
                logExcerpt: inspection.logExcerpt,
                diagnosticSummary: shouldStop
                  ? "Stopped repair loop due to repeated failure signature or attempt limit."
                  : inspection.headline,
                modifiedFiles: [],
                repaired: false,
              },
            ],
          }),
          input.runtimeId,
        ),
      };
    }

    input.seenFailureSignatures.add(inspection.failureSignature);

    const diagnostic = buildDiagnosticArtifact({
      inspection,
      runtimeFailure: input.failure,
      workspace,
      projectBrief: generationContext.projectBrief,
      projectMemorySummary: generationContext.projectMemory?.llmContextSummary,
      generatedFileMetadata: generationContext.fileSetMetadata,
    });

    try {
      const fixResult = await this.generateFixBundle(diagnostic);
      const nextPlan = applyFixBundleToWorkspacePlan(workspacePlan, fixResult.fixBundle);
      const nextWorkspace = await this.pipeline.materializeWorkspace(nextPlan);
      const nextTarget = await this.pipeline.createRuntimeTarget(nextWorkspace);

      return {
        repaired: true,
        pendingAttempt: {
          attemptId: fixResult.fixBundle.fixId,
          failureKind: inspection.failureKind,
          failureSignature: inspection.failureSignature,
          startedAt: nowIso(),
          logExcerpt: inspection.logExcerpt,
          diagnosticSummary: fixResult.fixBundle.reasoningSummary,
          modifiedFiles: fixResult.fixBundle.files.map((file) => file.path),
          provider: fixResult.provider,
          repaired: fixResult.repaired,
        },
        session: this.requireSession(
          this.store.update(input.runtimeId, {
            status: "preparing",
            updatedAt: nowIso(),
            failure: undefined,
            repairAttempts: finalizedAttempts,
            workspacePlan: nextPlan,
            workspace: nextWorkspace,
            workspaceId: nextWorkspace.workspaceId,
            target: nextTarget,
            previewUrl: nextTarget.previewUrl,
            handle: undefined,
          }),
          input.runtimeId,
        ),
      };
    } catch (error) {
      return {
        repaired: false,
        session: this.requireSession(
          this.store.update(input.runtimeId, {
            status: "failed",
            updatedAt: nowIso(),
            failure: input.failure,
            repairAttempts: [
              ...finalizedAttempts,
              {
                attemptId: randomUUID(),
                runtimeId: input.runtimeId,
                workspaceId: session.workspaceId,
                failureKind: inspection.failureKind,
                failureSignature: inspection.failureSignature,
                status: "failed",
                startedAt: nowIso(),
                finishedAt: nowIso(),
                logExcerpt: inspection.logExcerpt,
                diagnosticSummary: error instanceof Error ? error.message : "The repair attempt could not be applied.",
                modifiedFiles: [],
                repaired: false,
              },
            ],
          }),
          input.runtimeId,
        ),
      };
    }
  }

  private toBrowserLogEntries(report: BrowserRuntimeErrorReport): RuntimeLogEntry[] {
    const timestamp = report.timestamp || nowIso();
    const entries: RuntimeLogEntry[] = [
      {
        id: randomUUID(),
        timestamp,
        stream: "browser",
        message: `${report.source}: ${report.message}${report.href ? ` @ ${report.href}` : ""}`,
      },
    ];

    if (report.componentStack) {
      entries.push({
        id: randomUUID(),
        timestamp,
        stream: "browser",
        message: report.componentStack,
      });
    }

    if (report.stack) {
      entries.push({
        id: randomUUID(),
        timestamp,
        stream: "browser",
        message: report.stack,
      });
    }

    return entries;
  }
}

function getCurrentRepairCycleState(repairAttempts: RuntimeRepairAttempt[]) {
  const cycleAttempts: RuntimeRepairAttempt[] = [];

  for (let index = repairAttempts.length - 1; index >= 0; index -= 1) {
    const attempt = repairAttempts[index];

    if (attempt.status === "fixed") {
      break;
    }

    cycleAttempts.unshift(attempt);
  }

  return {
    attemptCount: cycleAttempts.filter((attempt) => attempt.status !== "aborted").length,
    seenFailureSignatures: new Set(cycleAttempts.map((attempt) => attempt.failureSignature)),
  };
}
