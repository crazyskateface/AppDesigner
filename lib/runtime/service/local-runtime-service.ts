import { randomUUID } from "node:crypto";

import { generationPipeline, type GenerationPipeline } from "@/lib/generation/pipeline";
import type { Runner } from "@/lib/runtime/contracts";
import type { RuntimeFailure } from "@/lib/runtime/logs";
import { DockerRunner } from "@/lib/runtime/runners/docker/docker-runner";
import type { RuntimeLogPage, RuntimeSession, StartRuntimeInput } from "@/lib/runtime/service/dto";
import { RuntimeServiceNotFoundError, type RuntimeService } from "@/lib/runtime/service/runtime-service";
import { InMemoryRuntimeSessionStore } from "@/lib/runtime/store/in-memory-runtime-store";
import type { RuntimeSessionRecord, RuntimeSessionStore } from "@/lib/runtime/store/runtime-session-store";

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

export class LocalRuntimeService implements RuntimeService {
  constructor(
    private readonly runner: Runner = new DockerRunner(),
    private readonly store: RuntimeSessionStore = new InMemoryRuntimeSessionStore(),
    private readonly pipeline: GenerationPipeline = generationPipeline,
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
    };

    this.store.save(initialSession);

    try {
      const workspacePlan = this.pipeline.planWorkspace(input.generatedSpec, input.projectId);
      const workspace = await this.pipeline.materializeWorkspace(workspacePlan);
      let target = await this.pipeline.createRuntimeTarget(workspace);

      this.store.update(runtimeId, {
        workspaceId: workspace.workspaceId,
        previewUrl: target.previewUrl,
        target,
        updatedAt: nowIso(),
      });

      try {
        await this.runner.prepare(target);
      } catch (error) {
        return toPublicSession(
          this.requireSession(
            this.store.update(runtimeId, {
              status: "failed",
              updatedAt: nowIso(),
              failure: createFailure("image_build_failed", error, "Docker image build failed."),
            }),
            runtimeId,
          ),
        );
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

          target = await this.pipeline.createRuntimeTarget(workspace);
          this.store.update(runtimeId, {
            previewUrl: target.previewUrl,
            target,
            updatedAt: nowIso(),
          });
          handle = await this.runner.start(target);
        }

        const status = await this.runner.getStatus(handle);

        return toPublicSession(
          this.requireSession(
            this.store.update(runtimeId, {
              handle,
              status: status === "idle" ? "starting" : status,
              updatedAt: nowIso(),
            }),
            runtimeId,
          ),
        );
      } catch (error) {
        return toPublicSession(
          this.requireSession(
            this.store.update(runtimeId, {
              status: "failed",
              updatedAt: nowIso(),
              failure: createFailure("container_start_failed", error, "Docker container failed to start."),
            }),
            runtimeId,
          ),
        );
      }
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
        entries: [],
      };
    }

    return {
      runtimeId,
      entries: await this.runner.getLogs(session.handle),
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
}
