"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  BilingualButtonLabel,
  BilingualText,
} from "@/components/BilingualText";
import { Card } from "@/components/Card";
import { CompareFloatingBar } from "@/components/CompareFloatingBar";
import { RemoteImage } from "@/components/RemoteImage";
import { comparePagePath, earphonePagePath } from "@/lib/brand-url";
import { diagnoseCopy, type BilingualCopy } from "@/lib/diagnose/copy";
import { formatPrice } from "@/lib/format";
import type {
  RecommendResult,
  ScoredEarphone,
} from "@/lib/diagnose/scoreEarphones";
import type { Earphone } from "@/types/database";

const MAX_COMPARE = 3;
const { results: resultsCopy } = diagnoseCopy;

type DiagnoseResultsProps = {
  result: RecommendResult;
  onRestart: () => void;
};

export function DiagnoseResults({ result, onRestart }: DiagnoseResultsProps) {
  const { items, relaxed, relaxedFilters } = result;
  const [selected, setSelected] = useState<Earphone[]>([]);
  const [limitMessage, setLimitMessage] = useState<BilingualCopy | null>(null);

  useEffect(() => {
    setSelected([]);
  }, [items]);

  useEffect(() => {
    if (!limitMessage) {
      return;
    }
    const timer = window.setTimeout(() => setLimitMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [limitMessage]);

  const toggleSelection = useCallback((earphone: Earphone) => {
    setSelected((current) => {
      const isSelected = current.some((item) => item.id === earphone.id);
      if (isSelected) {
        return current.filter((item) => item.id !== earphone.id);
      }
      if (current.length >= MAX_COMPARE) {
        setLimitMessage(resultsCopy.compareLimit);
        return current;
      }
      return [...current, earphone];
    });
  }, []);

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
          setSelected((current) => current.filter((item) => item.id !== id))
        }
        onClear={() => setSelected([])}
      />
    </div>
  );
}

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
      <Card className="overflow-hidden p-0">
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
          <BilingualText
            copy={resultsCopy.score(rank, score)}
            size="xs"
            enClassName="font-medium tracking-wide text-teal-700"
            jaClassName="!text-teal-700/70"
          />
          <label className="flex cursor-pointer items-start gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(earphone)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <BilingualText
              copy={compareLabel}
              size="xs"
              enClassName="font-medium text-gray-800"
            />
          </label>
        </div>

        <Link href={detailHref} className="block transition-opacity hover:opacity-95">
          <RemoteImage
            src={earphone.image_url}
            alt={`${earphone.name}`}
            className="h-48 w-full object-cover"
            width={400}
            height={192}
            placeholderClassName="aspect-[5/3] h-48 w-full"
          />
        </Link>

        <div className="p-4">
          <p className="text-xs text-gray-500">{earphone.brand}</p>
          <h3 className="mb-2 text-lg font-medium tracking-tight text-gray-900">
            <Link
              href={detailHref}
              className="transition-colors hover:text-teal-700"
            >
              {earphone.name}
            </Link>
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
        </div>
      </Card>
    </li>
  );
}
