import net from "node:net";

import type { MaterializedWorkspace } from "@/lib/workspace/model";
import type { RuntimeTarget } from "@/lib/runtime/contracts";

function getAvailablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();

    server.unref();

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve an available port."));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

export async function materializedWorkspaceToRuntimeTarget(
  workspace: MaterializedWorkspace,
): Promise<RuntimeTarget> {
  const hostPort = await getAvailablePort();

  return {
    projectId: workspace.projectId,
    workspaceId: workspace.workspaceId,
    workspacePath: workspace.absoluteRootPath,
    hostPort,
    containerPort: workspace.manifest.containerPort,
    previewUrl: `http://127.0.0.1:${hostPort}`,
  };
}
