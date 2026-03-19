import { z } from "zod";

export const workspaceFileSchema = z.object({
  path: z.string().min(1),
  kind: z.enum(["source", "config", "asset"]),
  content: z.string(),
});

export const workspaceManifestSchema = z.object({
  packageManager: z.literal("npm"),
  installCommand: z.array(z.string().min(1)).min(1),
  devCommand: z.array(z.string().min(1)).min(1),
  buildCommand: z.array(z.string().min(1)).min(1),
  containerPort: z.number().int().positive(),
  dockerfilePath: z.string().min(1),
});
