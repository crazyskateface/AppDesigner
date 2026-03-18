import type { AppSpec } from "@/lib/domain/app-spec/schema";
import type { AppPreviewModel } from "@/lib/preview/model";

export function appSpecToPreviewModel(spec: AppSpec): AppPreviewModel {
  return spec;
}
