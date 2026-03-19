import { generateDirectUiEdit } from "@/lib/builder/edits/direct-ui-edit";
import { resolveEditModeStrategy } from "@/lib/builder/edits/edit-mode-router";
import { getEditGenerationNoopMessage } from "@/lib/builder/edit-generation-result";
import { generateBuilderAssistantReply } from "@/lib/builder/chat/assistant-reply";
import type { StructuredObjectGenerator } from "@/lib/llm/types";
import { decideClarificationForPromptContext } from "@/lib/planner/clarification/decision";
import { buildPromptContextEnvelope } from "@/lib/planner/prompt-context";
import { getRuntimeService } from "@/lib/runtime/service";
import { generateAppSpecFromPrompt } from "@/lib/spec-pipeline/app-spec-generation-orchestrator";

import type { BuilderGenerateRequest, BuilderGenerateResponse } from "@/lib/builder/generation/contract";

function summarizePreparedDirectEdit(appTitle: string, directEdit: { files: Array<{ path: string }> }) {
  const touchedPaths = directEdit.files.map((file) => file.path);
  const pathSummary =
    touchedPaths.length === 1 ? touchedPaths[0] : `${touchedPaths.slice(0, 2).join(", ")}${touchedPaths.length > 2 ? ", ..." : ""}`;

  return `Prepared a direct source edit for ${appTitle} touching ${pathSummary}. I will only confirm success after the workspace update is applied and verified.`;
}

export async function resolveBuilderGenerateRequest(
  input: BuilderGenerateRequest,
  options: {
    provider?: StructuredObjectGenerator;
  } = {},
): Promise<BuilderGenerateResponse> {
  const promptContext = buildPromptContextEnvelope({
    prompt: input.prompt,
    mode: input.mode,
    clarificationAnswers: input.clarificationAnswers,
    projectMemory: input.projectMemory,
    currentSpec: input.currentSpec,
  });

  const clarification = await decideClarificationForPromptContext(promptContext, {
    provider: options.provider,
  });

  if (clarification.decision === "ask-clarify") {
    if (!input.clarificationAnswers.length) {
      const assistantMessage = await generateBuilderAssistantReply(
        {
          promptContext,
          outcomeSummary: `Clarification is required before building. Summary: ${clarification.summary}`,
          fallbackMessage: clarification.summary,
        },
        {
          provider: options.provider,
        },
      );

      return {
        status: "clarification_required",
        assistantMessage,
        clarification: {
          decision: "ask-clarify",
          summary: clarification.summary,
          questions: clarification.questions,
        },
      };
    }
  }

  if (input.mode === "edit" && input.currentSpec && input.runtimeId) {
    const editStrategy = resolveEditModeStrategy(input.prompt);

    if (editStrategy === "direct-ui-source-edit") {
      const workspaceContext = getRuntimeService().getRuntimeWorkspaceFiles(input.runtimeId);
      const currentFiles = workspaceContext.files.filter((file) => file.kind === "source");
      const directEdit = await generateDirectUiEdit(
        {
          prompt: input.prompt,
          currentFiles,
          appTitle: input.currentSpec.title,
        },
        {
          provider: options.provider,
        },
      );
      return {
        status: "generation_ready",
        assistantMessage: summarizePreparedDirectEdit(input.currentSpec.title, directEdit),
        changeStatus: "changed",
        appSpec: input.currentSpec,
        generationMeta: {
          source: "llm",
          repaired: false,
        },
        directEdit: {
          strategy: "direct-ui-source-edit",
          summary: directEdit.summary,
          files: directEdit.files,
          notes: directEdit.notes,
        },
      };
    }
  }

  const generation = await generateAppSpecFromPrompt(promptContext, {
    provider: options.provider,
    mode: input.mode,
    currentSpec: input.currentSpec,
  });
  const noOpMessage =
    input.mode === "edit" && input.currentSpec
      ? getEditGenerationNoopMessage(input.currentSpec, generation.appSpec, input.prompt)
      : null;
  const changeStatus = noOpMessage ? "unchanged" : "changed";
  const fallbackMessage = noOpMessage
    ? noOpMessage
    : input.mode === "edit"
      ? `I updated ${generation.appSpec.title}.`
      : `I created ${generation.appSpec.title}.`;
  const outcomeSummary = noOpMessage
    ? `No supported structural change was applied. ${noOpMessage}`
    : generation.generationMeta.source === "fallback"
      ? `The builder generated a safe fallback app result titled ${generation.appSpec.title}.`
      : input.mode === "edit"
        ? `The builder produced an updated app result titled ${generation.appSpec.title}.`
        : `The builder produced a new app titled ${generation.appSpec.title}.`;
  const assistantMessage = await generateBuilderAssistantReply(
    {
      promptContext,
      outcomeSummary,
      fallbackMessage,
    },
    {
      provider: options.provider,
    },
  );

  return {
    status: "generation_ready",
    assistantMessage,
    changeStatus,
    appSpec: generation.appSpec,
    generationMeta: generation.generationMeta,
  };
}
