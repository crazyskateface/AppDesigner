"use client";

import { useMemo, useState } from "react";

import type { ClarificationQuestion } from "@/lib/planner/clarification/types";
import type { ClarificationAnswer } from "@/lib/planner/prompt-context";

type ClarificationFormProps = {
  questions: ClarificationQuestion[];
  disabled?: boolean;
  onSubmit: (answers: ClarificationAnswer[]) => Promise<void> | void;
};

export function ClarificationForm({ questions, disabled = false, onSubmit }: ClarificationFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((question) => [question.id, ""])),
  );

  const hasEmptyRequiredAnswer = useMemo(
    () => questions.some((question) => question.required && !values[question.id]?.trim()),
    [questions, values],
  );

  return (
    <form
      className="mt-3 space-y-3 rounded-[1rem] border border-black/8 bg-[var(--color-panel)] px-3 py-3"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(
          questions.map((question) => ({
            questionId: question.id,
            label: question.label,
            answer: values[question.id]?.trim() ?? "",
          })),
        );
      }}
    >
      <div>
        <p className="text-sm font-medium text-[var(--color-ink)]">Answer the clarification questions</p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
          Keep answers short and concrete so the planner can move straight into the build.
        </p>
      </div>

      {questions.map((question) => (
        <label key={question.id} className="block">
          <span className="text-xs font-medium text-[var(--color-ink)]">{question.label}</span>
          <textarea
            value={values[question.id] ?? ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [question.id]: event.target.value,
              }))
            }
            rows={2}
            disabled={disabled}
            placeholder={question.placeholder}
            className="mt-2 w-full rounded-[0.95rem] border border-black/10 bg-white px-3 py-2 text-sm leading-6 text-[var(--color-ink)] outline-none transition focus:border-black/20 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
          />
          {question.reason ? (
            <span className="mt-1 block text-[11px] leading-5 text-[var(--color-muted)]">{question.reason}</span>
          ) : null}
        </label>
      ))}

      <button
        type="submit"
        disabled={disabled || hasEmptyRequiredAnswer}
        className="inline-flex w-full items-center justify-center rounded-full bg-[var(--color-ink)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--color-ink-soft)] disabled:cursor-not-allowed disabled:bg-[var(--color-muted)]"
      >
        {disabled ? "Continuing..." : "Continue"}
      </button>
    </form>
  );
}
