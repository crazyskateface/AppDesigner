import { randomUUID } from "node:crypto";

import type { Runner, RunnerHandle, RunnerStatus, RuntimeTarget } from "@/lib/runtime/contracts";
import type { RuntimeLogEntry } from "@/lib/runtime/logs";
import { runDockerCommand } from "@/lib/runtime/runners/docker/docker-command";
import {
  getDockerContainerName,
  getDockerImageTag,
} from "@/lib/runtime/runners/docker/docker-target";

function createLogEntry(stream: RuntimeLogEntry["stream"], message: string): RuntimeLogEntry {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    stream,
    message,
  };
}

async function isPreviewReachable(url: string) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForPreview(url: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for runtime at ${url}.`);
}

async function removeExistingContainer(containerName: string) {
  try {
    await runDockerCommand(["rm", "-f", containerName]);
  } catch {}
}

async function runDockerExec(containerName: string, command: string[]) {
  return runDockerCommand(["exec", containerName, ...command]);
}

export class DockerRunner implements Runner {
  private readonly logsByRunId = new Map<string, RuntimeLogEntry[]>();
  private readonly statusByRunId = new Map<string, RunnerStatus>();

  async prepare(target: RuntimeTarget) {
    const containerName = getDockerContainerName(target);
    const imageTag = getDockerImageTag(target);

    await removeExistingContainer(containerName);

    try {
      const { stdout, stderr } = await runDockerCommand(["build", "-t", imageTag, target.workspacePath]);
      const logs = [stdout, stderr]
        .filter(Boolean)
        .map((message) => createLogEntry("system", message.trim()))
        .filter((entry) => entry.message.length > 0);

      this.logsByRunId.set(containerName, logs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Docker build failed.";
      this.logsByRunId.set(containerName, [createLogEntry("stderr", message)]);
      throw error;
    }
  }

  async start(target: RuntimeTarget) {
    const containerName = getDockerContainerName(target);
    const imageTag = getDockerImageTag(target);
    const runId = randomUUID();
    const seededLogs = this.logsByRunId.get(containerName) ?? [];

    this.logsByRunId.set(runId, seededLogs);
    this.statusByRunId.set(runId, "starting");

    try {
      const { stdout } = await runDockerCommand([
        "run",
        "-d",
        "--rm",
        "--name",
        containerName,
        "-p",
        `${target.hostPort}:${target.containerPort}`,
        imageTag,
      ]);

      this.logsByRunId.set(runId, [
        ...seededLogs,
        createLogEntry("system", `Container started: ${stdout.trim()}`),
      ]);

      await waitForPreview(target.previewUrl);
      this.statusByRunId.set(runId, "running");

      return {
        runId,
        target,
      } satisfies RunnerHandle;
    } catch (error) {
      this.statusByRunId.set(runId, "failed");
      const message = error instanceof Error ? error.message : "Docker container failed to start.";

      this.logsByRunId.set(runId, [...seededLogs, createLogEntry("stderr", message)]);
      throw error;
    }
  }

  async restartDevServer(handle: RunnerHandle) {
    const containerName = getDockerContainerName(handle.target);
    const existing = this.logsByRunId.get(handle.runId) ?? [];

    this.statusByRunId.set(handle.runId, "starting");

    try {
      await runDockerExec(containerName, ["sh", "/workspace/.appdesigner/runtime/restart-dev-server.sh"]);
      await waitForPreview(handle.target.previewUrl, 15_000);
      this.statusByRunId.set(handle.runId, "running");
      this.logsByRunId.set(handle.runId, [
        ...existing,
        createLogEntry("system", "Restarted the dev server inside the running container."),
      ]);
    } catch (error) {
      this.statusByRunId.set(handle.runId, "failed");
      const message = error instanceof Error ? error.message : "Failed to restart the dev server inside the container.";
      this.logsByRunId.set(handle.runId, [...existing, createLogEntry("stderr", message)]);
      throw error;
    }
  }

  async stop(handle: RunnerHandle) {
    const containerName = getDockerContainerName(handle.target);

    await removeExistingContainer(containerName);
    this.statusByRunId.set(handle.runId, "stopped");
  }

  async getStatus(handle: RunnerHandle) {
    const containerName = getDockerContainerName(handle.target);

    try {
      const { stdout } = await runDockerCommand(["inspect", "-f", "{{.State.Status}}", containerName]);
      const state = stdout.trim();

      if (state === "running") {
        try {
          const { stdout } = await runDockerExec(containerName, ["sh", "/workspace/.appdesigner/runtime/dev-server-status.sh"]);
          const devServerState = stdout.trim();

          if (devServerState !== "running") {
            this.statusByRunId.set(handle.runId, "failed");
            return "failed";
          }

          if (await isPreviewReachable(handle.target.previewUrl)) {
            this.statusByRunId.set(handle.runId, "running");
            return "running";
          }

          this.statusByRunId.set(handle.runId, "starting");
          return "starting";
        } catch (error) {
          const message = error instanceof Error ? error.message : "";

          if (message.includes("No such file or directory")) {
            const reachable = await isPreviewReachable(handle.target.previewUrl);
            this.statusByRunId.set(handle.runId, reachable ? "running" : "failed");
            return reachable ? "running" : "failed";
          }

          this.statusByRunId.set(handle.runId, "failed");
          return "failed";
        }
      }

      if (state === "exited" || state === "dead") {
        this.statusByRunId.set(handle.runId, "stopped");
        return "stopped";
      }

      return this.statusByRunId.get(handle.runId) ?? "idle";
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const previous = this.statusByRunId.get(handle.runId);

      if (message.includes("No such object")) {
        this.statusByRunId.set(handle.runId, "stopped");
        return "stopped";
      }

      if (previous === "failed") {
        return "failed";
      }

      this.statusByRunId.set(handle.runId, previous === "stopped" ? "stopped" : "failed");
      return previous === "stopped" ? "stopped" : "failed";
    }
  }

  async getLogs(handle: RunnerHandle) {
    const containerName = getDockerContainerName(handle.target);
    const existing = this.logsByRunId.get(handle.runId) ?? [];

    try {
      const { stdout, stderr } = await runDockerCommand(["logs", "--timestamps", containerName]);
      const dockerLogEntries = [stdout, stderr]
        .filter(Boolean)
        .flatMap((chunk) =>
          chunk
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => createLogEntry("stdout", line)),
        );

      return [...existing, ...dockerLogEntries];
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read Docker logs.";

      return [...existing, createLogEntry("stderr", message)];
    }
  }

  async getPreparationLogs(target: RuntimeTarget) {
    const containerName = getDockerContainerName(target);
    return this.logsByRunId.get(containerName) ?? [];
  }
}
