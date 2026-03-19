import { z } from "zod";

export const generatedFixFileSchema = z.object({
  path: z.string().min(1),
  kind: z.literal("source"),
  content: z.string().min(1),
});

export const generatedFixBundleSchema = z.object({
  fixId: z.string().min(1),
  diagnosticId: z.string().min(1),
  reasoningSummary: z.string().min(1),
  files: z.array(generatedFixFileSchema).min(1).max(8),
});

export type GeneratedFixBundle = z.infer<typeof generatedFixBundleSchema>;
