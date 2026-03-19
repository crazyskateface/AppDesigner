import type { DependencyChangeSetAction } from "@/lib/applications/orchestrator/actions/schema";

type PackageJsonShape = {
  name: string;
  version: string;
  private: boolean;
  type: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const validPackageNamePattern =
  /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

function serializePackageJson(value: PackageJsonShape) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function isSafePackageSpec(name: string, version?: string) {
  if (!validPackageNamePattern.test(name)) {
    return false;
  }

  const value = version?.trim() ?? "";

  if (!value) {
    return true;
  }

  return !/^(?:file:|link:|git\+|https?:|github:|workspace:|\/|\.{1,2}\/)/i.test(value);
}

export function applyDependencyChangesToPackageJson(
  packageJsonContent: string,
  changes: DependencyChangeSetAction["inputs"]["packages"],
) {
  const parsed = JSON.parse(packageJsonContent) as PackageJsonShape;
  const nextDependencies = { ...(parsed.dependencies ?? {}) };
  const nextDevDependencies = { ...(parsed.devDependencies ?? {}) };

  for (const change of changes) {
    const target = change.section === "devDependencies" ? nextDevDependencies : nextDependencies;
    const alternate = change.section === "devDependencies" ? nextDependencies : nextDevDependencies;

    if (change.change === "remove") {
      delete target[change.name];
      delete alternate[change.name];
      continue;
    }

    target[change.name] = change.version?.trim() || "latest";
    delete alternate[change.name];
  }

  const nextValue: PackageJsonShape = {
    ...parsed,
    dependencies: sortRecord(nextDependencies),
    devDependencies: sortRecord(nextDevDependencies),
  };

  return serializePackageJson(nextValue);
}

function sortRecord(record: Record<string, string>) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}
