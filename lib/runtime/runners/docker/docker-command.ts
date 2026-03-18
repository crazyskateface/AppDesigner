import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runDockerCommand(args: string[]) {
  return execFileAsync("docker", args, {
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 16,
  });
}
