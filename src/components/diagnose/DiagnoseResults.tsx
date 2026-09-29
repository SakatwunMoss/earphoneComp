"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  BilingualButtonLabel,
  BilingualText,
} from "@/components/BilingualText";
import { CompareFloatingBar } from "@/components/CompareFloatingBar";
import { RemoteImage } from "@/components/RemoteImage";
import { comparePagePath, earphonePagePath } from "@/lib/brand-url";
import { diagnoseCopy, type BilingualCopy } from "@/lib/diagnose/copy";
import {
  DIAGNOSE_MAX_COMPARE,
  sanitizeSelectedIds,
} from "@/lib/diagnose/persist";
import { formatPrice } from "@/lib/format";
import type {
  RecommendResult,
  ScoredEarphone,
} from "@/lib/diagnose/scoreEarphones";
import type { Earphone } from "@/types/database";

const MAX_COMPARE = DIAGNOSE_MAX_COMPARE;
const { results: resultsCopy } = diagnoseCopy;

type DiagnoseResultsProps = {
  result: RecommendResult;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onRestart: () => void;
};

export function DiagnoseResults({
  result,
  selectedIds,
  onSelectedIdsChange,
  onRestart,
}: DiagnoseResultsProps) {
  const { items, relaxed, relaxedFilters } = result;
  const [limitMessage, setLimitMessage] = useState<BilingualCopy | null>(null);

  const selected = selectedIds
    .map((id) => items.find((item) => item.earphone.id === id)?.earphone)
    .filter((earphone): earphone is Earphone => earphone != null);

  useEffect(() => {
    if (!limitMessage) {
      return;
    }
    const timer = window.setTimeout(() => setLimitMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [limitMessage]);

  const toggleSelection = useCallback(
    (earphone: Earphone) => {
      const isSelected = selectedIds.includes(earphone.id);
      if (isSelected) {
        onSelectedIdsChange(selectedIds.filter((id) => id !== earphone.id));
        return;
      }
      if (selectedIds.length >= MAX_COMPARE) {
        setLimitMessage(resultsCopy.compareLimit);
        return;
      }
      onSelectedIdsChange(
        sanitizeSelectedIds(
          [...selectedIds, earphone.id],
          items.map((item) => item.earphone.id),
          MAX_COMPARE,
        ),
      );
    },
    [items, onSelectedIdsChange, selectedIds],
  );

  const top3Ids = items.slice(0, 3).map((item) => item.earphone.id);
  const top3CompareHref =
    top3Ids.length > 0 ? comparePagePath(top3Ids) : "/compare";
  const topCount = Math.min(3, top3Ids.length);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center">
        <BilingualText
          as="p"
          copy={resultsCopy.empty}
          size="sm"
          className="items-center"
          enClassName="text-gray-600"
        />
        <button
          type="button"
          onClick={onRestart}
          className="mt-6 inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-teal-600 px-5 py-2 text-white transition-colors hover:bg-teal-700"
        >
          <BilingualButtonLabel inverted copy={resultsCopy.restart} />
        </button>
      </div>
    );
  }

  return (
    <div>
      {relaxed ? (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
          role="status"
        >
          <BilingualText
            copy={resultsCopy.relaxed}
            size="sm"
            enClassName="text-amber-950"
            jaClassName="!text-amber-900/80"
          />
          {relaxedFilters.length > 0 ? (
            <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
              <span lang="en">
                ({resultsCopy.relaxedPrefix.en}:{" "}
                {relaxedFilters.map((f) => f.en).join(" → ")})
              </span>
              <span className="mx-1.5 text-amber-700/50" aria-hidden>
                /
              </span>
              <span lang="ja">
                （{resultsCopy.relaxedPrefix.ja}:{" "}
                {relaxedFilters.map((f) => f.ja).join(" → ")}）
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BilingualText
          copy={resultsCopy.count(items.length)}
          size="sm"
          enClassName="text-gray-600"
        />
        <div className="flex flex-wrap gap-2">
          {top3Ids.length >= 2 ? (
            <Link
              href={top3CompareHref}
              className="inline-flex min-h-[3rem] items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-white transition-colors hover:bg-teal-700"
            >
              <BilingualButtonLabel
                inverted
                copy={resultsCopy.compareTop(topCount)}
              />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex min-h-[3rem] items-center justify-center rounded-xl border border-teal-200 bg-white px-4 py-2 text-teal-800 transition-colors hover:border-teal-300 hover:bg-teal-50"
          >
            <BilingualButtonLabel copy={resultsCopy.restart} />
          </button>
        </div>
      </div>

      {limitMessage ? (
        <div
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
          role="alert"
        >
          <BilingualText
            copy={limitMessage}
            size="sm"
            enClassName="text-amber-950"
            jaClassName="!text-amber-900/80"
          />
        </div>
      ) : null}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <ResultCard
            key={item.earphone.id}
            item={item}
            rank={index + 1}
            isSelected={selected.some((s) => s.id === item.earphone.id)}
            onToggle={toggleSelection}
          />
        ))}
      </ul>

      <BilingualText
        as="p"
        copy={resultsCopy.compareHint}
        size="xs"
        className="mt-4"
        enClassName="text-gray-500"
      />

      <CompareFloatingBar
        showBrand
        compareHref={comparePagePath(selected.map((item) => item.id))}
        selected={selected.map((item) => ({
          id: item.id,
          name: item.name,
          brand: item.brand,
        }))}
        onRemove={(id) =>
          onSelectedIdsChange(selectedIds.filter((itemId) => itemId !== id))
        }
        onClear={() => onSelectedIdsChange([])}
      />
    </div>
  );
}

const resultCardClassName =
  "group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md active:translate-y-0 active:border-teal-400 active:shadow-sm";

function ResultCard({
  item,
  rank,
  isSelected,
  onToggle,
}: {
  item: ScoredEarphone;
  rank: number;
  isSelected: boolean;
  onToggle: (earphone: Earphone) => void;
}) {
  const { earphone, score, reasons } = item;
  const detailHref = earphonePagePath(earphone.brand, earphone.id);
  const compareLabel = isSelected
    ? resultsCopy.removeFromCompare
    : resultsCopy.addToCompare;

  return (
    <li>
      <article className={`${resultCardClassName} cursor-pointer`}>
        {/* カード全体を覆う単一リンク（入れ子リンクを避ける） */}
        <Link
          href={detailHref}
          className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          aria-label={`${earphone.name}の詳細を見る`}
        />

        <div
          className="relative z-10 flex items-start justify-between gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3"
          onClick={stopCardNavigation}
        >
          <BilingualText
            copy={resultsCopy.score(rank, score)}
            size="xs"
            enClassName="font-medium tracking-wide text-teal-700"
            jaClassName="!text-teal-700/70"
          />
          <label className="flex min-h-11 cursor-pointer items-start gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(earphone)}
              onClick={stopCardNavigation}
              className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <BilingualText
              copy={compareLabel}
              size="xs"
              enClassName="font-medium text-gray-800"
            />
          </label>
        </div>

        <div className="pointer-events-none relative">
          <RemoteImage
            src={earphone.image_url}
            alt={`${earphone.name}`}
            className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            width={400}
            height={192}
            placeholderClassName="aspect-[5/3] h-48 w-full"
          />

          <div className="p-4">
            <p className="text-xs text-gray-500">{earphone.brand}</p>
            <h3 className="mb-2 text-lg font-medium tracking-tight text-gray-900 transition-colors group-hover:text-teal-800 group-hover:underline group-hover:decoration-teal-300 group-hover:underline-offset-2">
              {earphone.name}
            </h3>
            <dl className="space-y-2 text-sm text-gray-600">
              <div className="flex gap-2">
                <dt className="shrink-0">
                  <BilingualText
                    copy={resultsCopy.price}
                    size="xs"
                    enClassName="font-medium text-gray-500"
                  />
                </dt>
                <dd className="font-medium tracking-tight text-gray-800">
                  {formatPrice(earphone.price)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">
                  <BilingualText
                    copy={resultsCopy.category}
                    size="xs"
                    enClassName="font-medium text-gray-500"
                  />
                </dt>
                <dd>{earphone.category}</dd>
              </div>
            </dl>

            <ul className="mt-3 flex flex-col gap-2">
              {reasons.map((reason) => (
                <li key={`${reason.en}-${reason.ja}`}>
                  <BilingualText
                    copy={reason}
                    size="xs"
                    enClassName="text-teal-900"
                    jaClassName="!text-teal-800/75"
                  />
                </li>
              ))}
            </ul>

            {renderDetailCue()}
          </div>
        </div>
      </article>
    </li>
  );
}

/** カード全体リンクへのクリック伝播を止め、比較チェックだけを操作する */
function stopCardNavigation(event: MouseEvent) {
  event.stopPropagation();
}

function renderDetailCue(): ReactNode {
  return (
    <span className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-white shadow-sm transition-all group-hover:bg-teal-700 group-active:scale-[0.98] group-active:bg-teal-800">
      <BilingualButtonLabel inverted copy={resultsCopy.viewDetails} />
      <ChevronRightIcon className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </span>
  );
}

function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
