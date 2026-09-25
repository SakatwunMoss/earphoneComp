"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

import {
  BilingualButtonLabel,
  BilingualText,
} from "@/components/BilingualText";
import { DiagnoseResults } from "@/components/diagnose/DiagnoseResults";
import { diagnoseCopy, type BilingualCopy } from "@/lib/diagnose/copy";
import {
  recommendEarphones,
  type BudgetPreference,
  type FormPreference,
  type NcPreference,
  type QuizAnswers,
  type WaterPreference,
} from "@/lib/diagnose/scoreEarphones";
import type { PriorityId, SceneId } from "@/lib/diagnose/tagKeywords";
import type { Earphone } from "@/types/database";

const STEPS = [
  "scene",
  "nc",
  "form",
  "budget",
  "priorities",
  "water",
] as const;

type StepId = (typeof STEPS)[number];

type DiagnoseQuizProps = {
  earphones: Earphone[];
};

type DraftAnswers = {
  scene: SceneId | null;
  nc: NcPreference | null;
  form: FormPreference | null;
  budget: BudgetPreference | null;
  priorities: PriorityId[];
  water: WaterPreference | null;
};

const INITIAL_DRAFT: DraftAnswers = {
  scene: null,
  nc: null,
  form: null,
  budget: null,
  priorities: [],
  water: null,
};

const { quiz: quizCopy, results: resultsCopy } = diagnoseCopy;

export function DiagnoseQuiz({ earphones }: DiagnoseQuizProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<DraftAnswers>(INITIAL_DRAFT);
  const [finished, setFinished] = useState(false);

  const step = STEPS[stepIndex];
  const progress = finished
    ? 100
    : Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const result = useMemo(() => {
    if (!finished) {
      return null;
    }
    const answers = toQuizAnswers(draft);
    if (!answers) {
      return null;
    }
    return recommendEarphones(earphones, answers, 5);
  }, [draft, earphones, finished]);

  function restart() {
    setDraft(INITIAL_DRAFT);
    setStepIndex(0);
    setFinished(false);
  }

  function goNext() {
    if (stepIndex >= STEPS.length - 1) {
      setFinished(true);
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    if (finished) {
      setFinished(false);
      setStepIndex(STEPS.length - 1);
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const canProceed = isStepComplete(step, draft);

  if (finished && result) {
    return (
      <div>
        <header className="mb-8">
          <BilingualText
            as="h1"
            copy={resultsCopy.title}
            size="3xl"
            enClassName="text-gray-900"
            jaClassName="!text-gray-600"
          />
          <BilingualText
            as="p"
            copy={resultsCopy.intro}
            size="sm"
            className="mt-3 max-w-xl"
            enClassName="text-gray-600"
          />
        </header>
        <DiagnoseResults result={result} onRestart={restart} />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <BilingualText
          as="h1"
          copy={quizCopy.title}
          size="3xl"
          enClassName="text-gray-900"
          jaClassName="!text-gray-600"
        />
        <BilingualText
          as="p"
          copy={quizCopy.intro}
          size="sm"
          className="mt-3 max-w-xl"
          enClassName="text-gray-600"
        />
      </header>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-3 text-gray-500">
          <BilingualText
            copy={quizCopy.questionProgress(stepIndex + 1, STEPS.length)}
            size="xs"
            enClassName="text-gray-500"
          />
          <span className="shrink-0 text-xs">{progress}%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-teal-100"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-teal-600 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-5 sm:p-6">
        <StepContent step={step} draft={draft} setDraft={setDraft} />

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <BilingualButtonLabel copy={quizCopy.back} />
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-teal-600 px-5 py-2 text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <BilingualButtonLabel
              inverted
              copy={
                stepIndex >= STEPS.length - 1
                  ? quizCopy.seeResults
                  : quizCopy.next
              }
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function toQuizAnswers(draft: DraftAnswers): QuizAnswers | null {
  if (
    draft.scene == null ||
    draft.nc == null ||
    draft.form == null ||
    draft.budget == null ||
    draft.water == null
  ) {
    return null;
  }
  return {
    scene: draft.scene,
    nc: draft.nc,
    form: draft.form,
    budget: draft.budget,
    priorities: draft.priorities,
    water: draft.water,
  };
}

function isStepComplete(step: StepId, draft: DraftAnswers): boolean {
  switch (step) {
    case "scene":
      return draft.scene != null;
    case "nc":
      return draft.nc != null;
    case "form":
      return draft.form != null;
    case "budget":
      return draft.budget != null;
    case "priorities":
      return draft.priorities.length > 0;
    case "water":
      return draft.water != null;
  }
}

function StepContent({
  step,
  draft,
  setDraft,
}: {
  step: StepId;
  draft: DraftAnswers;
  setDraft: Dispatch<SetStateAction<DraftAnswers>>;
}) {
  const { questions, options } = quizCopy;

  switch (step) {
    case "scene":
      return (
        <ChoiceStep
          title={questions.scene}
          options={(
            Object.entries(options.scene) as [SceneId, BilingualCopy][]
          ).map(([id, label]) => ({ id, label }))}
          value={draft.scene}
          onChange={(scene) => setDraft((d) => ({ ...d, scene }))}
        />
      );
    case "nc":
      return (
        <ChoiceStep
          title={questions.nc}
          options={(
            Object.entries(options.nc) as [NcPreference, BilingualCopy][]
          ).map(([id, label]) => ({ id, label }))}
          value={draft.nc}
          onChange={(nc) => setDraft((d) => ({ ...d, nc }))}
        />
      );
    case "form":
      return (
        <ChoiceStep
          title={questions.form}
          options={(
            Object.entries(options.form) as [FormPreference, BilingualCopy][]
          ).map(([id, label]) => ({ id, label }))}
          value={draft.form}
          onChange={(form) => setDraft((d) => ({ ...d, form }))}
        />
      );
    case "budget":
      return (
        <ChoiceStep
          title={questions.budget}
          options={(
            Object.entries(options.budget) as [
              BudgetPreference,
              BilingualCopy,
            ][]
          ).map(([id, label]) => ({ id, label }))}
          value={draft.budget}
          onChange={(budget) => setDraft((d) => ({ ...d, budget }))}
        />
      );
    case "priorities":
      return (
        <MultiChoiceStep
          title={questions.priorities}
          options={(
            Object.entries(options.priorities) as [PriorityId, BilingualCopy][]
          ).map(([id, label]) => ({ id, label }))}
          values={draft.priorities}
          onChange={(priorities) => setDraft((d) => ({ ...d, priorities }))}
        />
      );
    case "water":
      return (
        <ChoiceStep
          title={questions.water}
          options={(
            Object.entries(options.water) as [WaterPreference, BilingualCopy][]
          ).map(([id, label]) => ({ id, label }))}
          value={draft.water}
          onChange={(water) => setDraft((d) => ({ ...d, water }))}
        />
      );
  }
}

function ChoiceStep<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: BilingualCopy;
  options: { id: T; label: BilingualCopy }[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  return (
    <fieldset>
      <BilingualText
        as="legend"
        copy={title}
        size="lg"
        enClassName="font-medium text-gray-900"
        jaClassName="!text-gray-600"
      />
      <div className="mt-4 flex flex-col gap-2">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-teal-500 bg-white ring-1 ring-teal-500"
                  : "border-teal-100/80 bg-white/80 hover:border-teal-300"
              }`}
              aria-pressed={selected}
            >
              <BilingualText
                copy={option.label}
                size="sm"
                enClassName={
                  selected
                    ? "font-medium text-teal-900"
                    : "font-medium text-gray-800"
                }
                jaClassName={selected ? "!text-teal-700/80" : ""}
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function MultiChoiceStep<T extends string>({
  title,
  options,
  values,
  onChange,
}: {
  title: BilingualCopy;
  options: { id: T; label: BilingualCopy }[];
  values: T[];
  onChange: (ids: T[]) => void;
}) {
  function toggle(id: T) {
    if (values.includes(id)) {
      onChange(values.filter((v) => v !== id));
    } else {
      onChange([...values, id]);
    }
  }

  return (
    <fieldset>
      <BilingualText
        as="legend"
        copy={title}
        size="lg"
        enClassName="font-medium text-gray-900"
        jaClassName="!text-gray-600"
      />
      <div className="mt-4 flex flex-col gap-2">
        {options.map((option) => {
          const selected = values.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-teal-500 bg-white ring-1 ring-teal-500"
                  : "border-teal-100/80 bg-white/80 hover:border-teal-300"
              }`}
              aria-pressed={selected}
            >
              <BilingualText
                copy={option.label}
                size="sm"
                enClassName={
                  selected
                    ? "font-medium text-teal-900"
                    : "font-medium text-gray-800"
                }
                jaClassName={selected ? "!text-teal-700/80" : ""}
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
