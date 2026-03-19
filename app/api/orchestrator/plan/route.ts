import { NextResponse } from "next/server";

import { OpenAiConfigurationError } from "@/lib/llm/openai/client";
import { planProjectFromPrompt } from "@/lib/applications/orchestrator/main";
import { buildPromptContextEnvelope } from "@/lib/planner/prompt-context";
import { projectBriefPlanningRequestSchema } from "@/lib/planner/project-brief";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsedRequest = projectBriefPlanningRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error: "Please enter a more descriptive prompt about the app you want to build.",
        issues: parsedRequest.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await planProjectFromPrompt(
      buildPromptContextEnvelope({
        prompt: parsedRequest.data.prompt,
        clarificationAnswers: parsedRequest.data.clarificationAnswers,
        projectMemory: parsedRequest.data.projectMemory,
      }),
    );
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof OpenAiConfigurationError
        ? error.message
        : error instanceof Error && error.message
          ? error.message
          : "The orchestrator could not produce a project brief.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
