import {
  orchestratorActionResultSchema,
  type DependencyChangeSetAction,
  type OrchestratorActionResult,
} from "@/lib/applications/orchestrator/actions/schema";
import { applyDependencyChangesToPackageJson, isSafePackageSpec } from "@/lib/workspace/package-json-utils";

export function executePackageAction(
  action: DependencyChangeSetAction,
  input: {
    packageJsonContent: string;
  },
): OrchestratorActionResult {
  if (action.inputs.packages.length > action.safety.maxPackages) {
    throw new Error(`The dependency action exceeded the allowed package limit of ${action.safety.maxPackages}.`);
  }

  const invalidPackage = action.inputs.packages.find(
    (pkg) => !isSafePackageSpec(pkg.name, pkg.version),
  );

  if (invalidPackage) {
    throw new Error(`The dependency action requested an unsafe package spec for "${invalidPackage.name}".`);
  }

  if (action.executionPolicy === "planned-only" || !action.safety.allowExecution) {
    return orchestratorActionResultSchema.parse({
      actionId: action.id,
      kind: action.kind,
      status: "planned-only",
      summary: "Dependency/package changes were planned but not executed.",
      diagnostics: action.inputs.packages.map((pkg) => `Planned dependency change: ${pkg.change} ${pkg.name}`),
    });
  }

  const packageJson = applyDependencyChangesToPackageJson(input.packageJsonContent, action.inputs.packages);

  return orchestratorActionResultSchema.parse({
    actionId: action.id,
    kind: action.kind,
    status: "completed",
    summary: `Prepared ${action.inputs.packages.length} dependency/package changes for runtime install execution.`,
    artifacts: {
      packageJson,
      packageChanges: action.inputs.packages,
      installStrategy: "runtime-build",
    },
    diagnostics: [],
  });
}
