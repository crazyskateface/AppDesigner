import { appSpecSchema, type AppSpec } from "@/lib/domain/app-spec/schema";

export function normalizeTitleOverride(value: string, generatedTitle: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue === generatedTitle.trim()) {
    return null;
  }

  return trimmedValue;
}

export function applyTitleOverride(spec: AppSpec, titleOverride: string | null) {
  if (!titleOverride) {
    return spec;
  }

  return appSpecSchema.parse({
    ...spec,
    title: titleOverride,
  });
}
