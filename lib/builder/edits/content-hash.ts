import { createHash } from "node:crypto";

export function hashWorkspaceContent(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
