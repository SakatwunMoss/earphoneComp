"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  BilingualButtonLabel,
  BilingualText,
} from "@/components/BilingualText";
import { DiagnoseResults } from "@/components/diagnose/DiagnoseResults";
import { diagnoseCopy, type BilingualCopy } from "@/lib/diagnose/copy";
import {
  clearDiagnoseReturning,
  clearDiagnoseState,
  createInitialDraft,
  isDiagnoseResumeHref,
  loadDiagnoseState,
  markDiagnoseReturning,
  markMemoryRestoredFinished,
  onDiagnosePageLeave,
  sanitizeSelectedIds,
  saveDiagnoseState,
  selectedIdsEqual,
  shouldRestoreFinished,
  type PersistedDraft,
} from "@/lib/diagnose/persist";
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

/** Sticky site header offset so scroll targets are not hidden underneath. */
const QUIZ_SCROLL_MARGIN_CLASS = "scroll-mt-20";

type StepId = (typeof STEPS)[number];

type DiagnoseQuizProps = {
  earphones: Earphone[];
};

type DraftAnswers = PersistedDraft;

const INITIAL_DRAFT: DraftAnswers = createInitialDraft();

const { quiz: quizCopy, results: resultsCopy } = diagnoseCopy;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

export function DiagnoseQuiz({ earphones }: DiagnoseQuizProps) {
  const [hydrated, setHydrated] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<DraftAnswers>(INITIAL_DRAFT);
  const [finished, setFinished] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const questionTopRef = useRef<HTMLDivElement>(null);
  const resultsTopRef = useRef<HTMLDivElement>(null);
  const prevNavRef = useRef<{ stepIndex: number; finished: boolean } | null>(
    null,
  );
  const restoreScrollRef = useRef(false);

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

  // Restore from sessionStorage after mount (avoid SSR hydration mismatch).
  useEffect(() => {
    const stored = loadDiagnoseState(STEPS.length);
    if (stored) {
      if (stored.finished) {
        if (shouldRestoreFinished()) {
          setDraft(stored.draft);
          setStepIndex(stored.stepIndex);
          setFinished(true);
          setSelectedIds(stored.selectedIds);
          restoreScrollRef.current = true;
        } else {
          // Nav link etc. — don't resurrect an old result screen.
          clearDiagnoseState();
        }
      } else {
        setDraft(stored.draft);
        setStepIndex(stored.stepIndex);
        setFinished(false);
        setSelectedIds([]);
      }
    }
    setHydrated(true);
  }, []);

  // Persist on change (after restore).
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveDiagnoseState({ draft, stepIndex, finished, selectedIds });
  }, [draft, stepIndex, finished, selectedIds, hydrated]);

  // Drop compare IDs that vanished after result recalculation.
  useEffect(() => {
    if (!hydrated || !finished || !result) {
      return;
    }
    const available = result.items.map((item) => item.earphone.id);
    const next = sanitizeSelectedIds(selectedIds, available);
    if (!selectedIdsEqual(next, selectedIds)) {
      setSelectedIds(next);
    }
  }, [hydrated, finished, result, selectedIds]);

  // Mark returning when leaving for detail/compare so back can restore results.
  useEffect(() => {
    if (!hydrated || !finished) {
      return;
    }
    function onClickCapture(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }
      if (isDiagnoseResumeHref(href)) {
        markDiagnoseReturning();
      }
    }
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [hydrated, finished]);

  // Keep finished in-session across remounts; clear that guard when leaving
  // without a detail/compare return intent (so nav re-entry starts fresh).
  useEffect(() => {
    if (hydrated && finished) {
      markMemoryRestoredFinished();
    }
  }, [hydrated, finished]);

  // Clear returning after Strict Mode's double effect cycle settles.
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const timer = window.setTimeout(() => {
      clearDiagnoseReturning();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated]);

  useEffect(() => {
    return () => {
      onDiagnosePageLeave();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const prev = prevNavRef.current;
    prevNavRef.current = { stepIndex, finished };
    // Skip first paint after hydrate (and Strict Mode double-invoke with same values).
    if (
      prev === null ||
      (prev.stepIndex === stepIndex && prev.finished === finished)
    ) {
      return;
    }

    const behavior = scrollBehavior();
    const target = finished
      ? resultsTopRef.current
      : questionTopRef.current;

    target?.scrollIntoView({ behavior, block: "start" });
  }, [stepIndex, finished, hydrated]);

  // After restoring a finished session, jump to the results heading.
  useEffect(() => {
    if (!hydrated || !finished || !restoreScrollRef.current) {
      return;
    }
    restoreScrollRef.current = false;
    resultsTopRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [hydrated, finished]);

  function restart() {
    clearDiagnoseState();
    setDraft(createInitialDraft());
    setStepIndex(0);
    setFinished(false);
    setSelectedIds([]);
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

  if (!hydrated) {
    return <DiagnoseQuizPlaceholder />;
  }

  if (finished && result) {
    return (
      <div ref={resultsTopRef} className={QUIZ_SCROLL_MARGIN_CLASS}>
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
        <DiagnoseResults
          result={result}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onRestart={restart}
        />
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

      <div
        ref={questionTopRef}
        className={`mb-6 ${QUIZ_SCROLL_MARGIN_CLASS}`}
      >
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

/** SSR / 復元前の見た目。タイトルは診断ページと同じで空HTMLを避ける */
function DiagnoseQuizPlaceholder() {
  return (
    <div aria-busy="true" aria-live="polite">
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

      <div className={`mb-6 ${QUIZ_SCROLL_MARGIN_CLASS}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="h-3 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-8 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-teal-100">
          <div className="h-full w-1/6 rounded-full bg-teal-200" />
        </div>
      </div>

      <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-5 sm:p-6">
        <div className="space-y-3">
          <div className="h-5 w-2/3 max-w-sm animate-pulse rounded bg-teal-100/80" />
          <div className="h-4 w-1/2 max-w-xs animate-pulse rounded bg-teal-100/60" />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl border border-teal-100/80 bg-white/80"
            />
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="h-12 w-24 animate-pulse rounded-xl bg-gray-200/80" />
          <div className="h-12 w-28 animate-pulse rounded-xl bg-teal-200/80" />
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
