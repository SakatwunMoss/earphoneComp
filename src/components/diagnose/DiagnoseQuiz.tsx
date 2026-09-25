"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

import { DiagnoseResults } from "@/components/diagnose/DiagnoseResults";
import {
  PRIORITY_LABELS,
  SCENE_LABELS,
  type PriorityId,
  type SceneId,
} from "@/lib/diagnose/tagKeywords";
import {
  recommendEarphones,
  type BudgetPreference,
  type FormPreference,
  type NcPreference,
  type QuizAnswers,
  type WaterPreference,
} from "@/lib/diagnose/scoreEarphones";
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
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            診断結果
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            回答をもとにスコアリングしたおすすめ機種です。
          </p>
        </header>
        <DiagnoseResults result={result} onRestart={restart} />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          好み診断
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
          いくつかの質問に答えると、登録機種から相性のよいイヤホンを提案します。
        </p>
      </header>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            質問 {stepIndex + 1} / {STEPS.length}
          </span>
          <span>{progress}%</span>
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
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {stepIndex >= STEPS.length - 1 ? "結果を見る" : "次へ"}
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
  switch (step) {
    case "scene":
      return (
        <ChoiceStep
          title="主な使用シーンは？"
          options={(
            Object.entries(SCENE_LABELS) as [SceneId, string][]
          ).map(([id, label]) => ({ id, label }))}
          value={draft.scene}
          onChange={(scene) => setDraft((d) => ({ ...d, scene }))}
        />
      );
    case "nc":
      return (
        <ChoiceStep
          title="ノイズキャンセリングは必要ですか？"
          options={[
            { id: "required" as const, label: "必須" },
            { id: "preferred" as const, label: "あった方がいい" },
            { id: "none" as const, label: "不要" },
          ]}
          value={draft.nc}
          onChange={(nc) => setDraft((d) => ({ ...d, nc }))}
        />
      );
    case "form":
      return (
        <ChoiceStep
          title="装着スタイルの希望は？"
          options={[
            { id: "tws" as const, label: "完全ワイヤレス希望" },
            { id: "any" as const, label: "どちらでも" },
          ]}
          value={draft.form}
          onChange={(form) => setDraft((d) => ({ ...d, form }))}
        />
      );
    case "budget":
      return (
        <ChoiceStep
          title="予算の上限は？"
          options={[
            { id: "under_10000" as const, label: "〜1万円" },
            { id: "under_30000" as const, label: "〜3万円" },
            { id: "no_limit" as const, label: "3万円以上（上限なし）" },
          ]}
          value={draft.budget}
          onChange={(budget) => setDraft((d) => ({ ...d, budget }))}
        />
      );
    case "priorities":
      return (
        <MultiChoiceStep
          title="特に重視するポイントは？（複数可）"
          options={(
            Object.entries(PRIORITY_LABELS) as [PriorityId, string][]
          ).map(([id, label]) => ({ id, label }))}
          values={draft.priorities}
          onChange={(priorities) => setDraft((d) => ({ ...d, priorities }))}
        />
      );
    case "water":
      return (
        <ChoiceStep
          title="汗・水濡れ対策は必要ですか？"
          options={[
            { id: "needed" as const, label: "必要" },
            { id: "not_needed" as const, label: "不要" },
          ]}
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
  title: string;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-lg font-medium tracking-tight text-gray-900">
        {title}
      </legend>
      <div className="mt-4 flex flex-col gap-2">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                selected
                  ? "border-teal-500 bg-white font-medium text-teal-900 ring-1 ring-teal-500"
                  : "border-teal-100/80 bg-white/80 text-gray-700 hover:border-teal-300"
              }`}
              aria-pressed={selected}
            >
              {option.label}
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
  title: string;
  options: { id: T; label: string }[];
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
      <legend className="text-lg font-medium tracking-tight text-gray-900">
        {title}
      </legend>
      <div className="mt-4 flex flex-col gap-2">
        {options.map((option) => {
          const selected = values.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                selected
                  ? "border-teal-500 bg-white font-medium text-teal-900 ring-1 ring-teal-500"
                  : "border-teal-100/80 bg-white/80 text-gray-700 hover:border-teal-300"
              }`}
              aria-pressed={selected}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
