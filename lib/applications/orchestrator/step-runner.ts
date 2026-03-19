import type { GeneratedFileSet } from "@/lib/codegen/model";
import { createViteReactScaffoldFiles } from "@/lib/codegen/vite-react/scaffold";
import type { OrchestratorActionPlan, OrchestratorActionResult } from "@/lib/applications/orchestrator/actions/schema";
import { planOrchestratorActions } from "@/lib/applications/orchestrator/actions/planner";
import { executePackageAction } from "@/lib/applications/orchestrator/executors/package-action-executor";
import { executeDevServerControlAction } from "@/lib/applications/orchestrator/executors/dev-server-control-executor";
import { executeFileWriteSetAction } from "@/lib/applications/orchestrator/executors/file-action-executor";
import { executeRuntimeInspectionAction } from "@/lib/applications/orchestrator/executors/runtime-inspection-executor";
import type { OrchestratorApplicationContext } from "@/lib/applications/orchestrator/context-loader";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { generatedFileSetToWorkspacePlan } from "@/lib/workspace/planners/generated-files-to-workspace";
import { createViteReactManifest } from "@/lib/workspace/templates/vite-react";
import type { WorkspacePlan } from "@/lib/workspace/model";
import { createPackageJson } from "@/lib/workspace/templates/vite-react/package-json";

export async function runOrchestratorSteps(
  context: OrchestratorApplicationContext,
  options: {
    provider?: StructuredObjectGenerator;
    fallback?: "none" | "template";
    controlDevServer?: (runtimeId: string, requestedStrategy: "hot-update" | "dev-server-restart" | "full-runtime-restart-required") => Promise<{
      strategyUsed: "hot-update" | "dev-server-restart" | "full-runtime-restart-required";
      summary: string;
    }>;
  } = {},
): Promise<WorkspacePlan> {
  const actionPlan = await planOrchestratorActions(context, options);
  const actionResults = await executeActionPlan(actionPlan, context, options);
  const completedFileAction = actionResults.find(
    (result) => result.kind === "file.write-set" && result.status === "completed",
  );

  if (!completedFileAction?.artifacts) {
    throw new Error("The orchestrator did not produce an executable file action result.");
  }

  const appFiles = completedFileAction.artifacts.files as GeneratedFileSet["files"] | undefined;
  const generationMeta = completedFileAction.artifacts.generationMeta as
    | {
        source: "llm" | "template-fallback";
        repaired: boolean;
        provider?: {
          name: string;
          model?: string;
        };
        fallbackReason?: "missing_api_key" | "provider_error" | "validation_error";
      }
    | undefined;

  if (!appFiles || !generationMeta) {
    throw new Error("The file action result did not include the expected generated file artifacts.");
  }

  const manifest = createViteReactManifest();
  const packageJsonResult = actionResults.filter(
    (result) => result.kind === "dependency.change-set" && result.status === "completed",
  ).at(-1);
  const packageJsonOverride =
    packageJsonResult?.artifacts && "packageJson" in packageJsonResult.artifacts
      ? (packageJsonResult.artifacts.packageJson as string)
      : null;
  const scaffoldFiles = createViteReactScaffoldFiles(context.projectBrief.title, manifest).map((file) =>
    file.path === "package.json" && packageJsonOverride
      ? {
          ...file,
          content: packageJsonOverride,
        }
      : file,
  );
  const fileSet: GeneratedFileSet = {
    strategy: "direct-codegen",
    targetKind: "vite-react-static",
    title: context.projectBrief.title,
    manifest,
    files: [...scaffoldFiles, ...appFiles],
    metadata: {
      sourceKind: "project-brief",
      sourceId: context.projectBrief.briefId,
      generation: {
        scaffold: "deterministic",
        appFiles: generationMeta.source === "template-fallback" ? "template-fallback" : "llm",
        repaired: generationMeta.repaired,
        provider: generationMeta.provider,
        fallbackReason: generationMeta.fallbackReason,
      },
    },
  };

  return generatedFileSetToWorkspacePlan(
    fileSet,
    context.projectId,
    context.appSpec.appId,
    context.projectBrief,
    context.projectMemory,
  );
}

export async function executeActionPlan(
  actionPlan: OrchestratorActionPlan,
  context: OrchestratorApplicationContext,
  options: {
    provider?: StructuredObjectGenerator;
    fallback?: "none" | "template";
    controlDevServer?: (runtimeId: string, requestedStrategy: "hot-update" | "dev-server-restart" | "full-runtime-restart-required") => Promise<{
      strategyUsed: "hot-update" | "dev-server-restart" | "full-runtime-restart-required";
      summary: string;
    }>;
  } = {},
) {
  const results: OrchestratorActionResult[] = [];
  const manifest = createViteReactManifest();
  let packageJsonContent = createPackageJson(context.projectBrief.title, manifest);

  for (const action of actionPlan.actions) {
    switch (action.kind) {
      case "file.write-set":
        results.push(
          await executeFileWriteSetAction(
            {
              ...action,
              inputs: {
                ...action.inputs,
                fallback: options.fallback ?? action.inputs.fallback,
              },
            },
            {
              provider: options.provider,
            },
          ),
        );
        const packageRequirements =
          results.at(-1)?.artifacts && "packageRequirements" in results.at(-1)!.artifacts!
            ? (results.at(-1)!.artifacts!.packageRequirements as Array<{
                name: string;
                version?: string;
                section: "dependencies" | "devDependencies";
              }>)
            : [];

        if (packageRequirements.length) {
          const dependencyResult = executePackageAction(
            {
              id: `${action.id}-package-sync`,
              kind: "dependency.change-set",
              reason: "Install the package requirements declared by the generated React app tree.",
              executionPolicy: "execute",
              safety: {
                allowExecution: true,
                maxPackages: 8,
              },
              inputs: {
                packages: packageRequirements.map((pkg) => ({
                  name: pkg.name,
                  version: pkg.version,
                  change: "add" as const,
                  section: pkg.section,
                })),
              },
            },
            {
              packageJsonContent,
            },
          );

          if (dependencyResult.artifacts && "packageJson" in dependencyResult.artifacts) {
            packageJsonContent = dependencyResult.artifacts.packageJson as string;
          }

          results.push(dependencyResult);
        }
        break;
      case "runtime.inspect":
        results.push(executeRuntimeInspectionAction(action, context.runtimeInspection));
        break;
      case "dependency.change-set":
        const dependencyResult = executePackageAction(action, {
          packageJsonContent,
        });

        if (dependencyResult.artifacts && "packageJson" in dependencyResult.artifacts) {
          packageJsonContent = dependencyResult.artifacts.packageJson as string;
        }

        results.push(dependencyResult);
        break;
      case "dev-server.control":
        results.push(
          await executeDevServerControlAction(action, {
            runtimeId: context.runtimeInspection?.runtimeId ?? null,
            controlDevServer: options.controlDevServer,
          }),
        );
        break;
    }
  }

  return results;
}
