"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/Card";
import { CompareFloatingBar } from "@/components/CompareFloatingBar";
import { RemoteImage } from "@/components/RemoteImage";
import { comparePagePath, earphonePagePath } from "@/lib/brand-url";
import { formatPrice } from "@/lib/format";
import type {
  RecommendResult,
  ScoredEarphone,
} from "@/lib/diagnose/scoreEarphones";
import type { Earphone } from "@/types/database";

const MAX_COMPARE = 3;

type DiagnoseResultsProps = {
  result: RecommendResult;
  onRestart: () => void;
};

export function DiagnoseResults({ result, onRestart }: DiagnoseResultsProps) {
  const { items, relaxed, relaxedFilters } = result;
  const [selected, setSelected] = useState<Earphone[]>([]);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

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
        setLimitMessage("比較は3機種まで選択できます");
        return current;
      }
      return [...current, earphone];
    });
  }, []);

  const top3Ids = items.slice(0, 3).map((item) => item.earphone.id);
  const top3CompareHref =
    top3Ids.length > 0 ? comparePagePath(top3Ids) : "/compare";

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center">
        <p className="text-sm text-gray-600">
          条件に合う機種が見つかりませんでした。条件を変えてもう一度お試しください。
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
        >
          もう一度診断する
        </button>
      </div>
    );
  }

  return (
    <div>
      {relaxed ? (
        <p
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          完全一致は見つかりませんでした。近い条件のおすすめはこちら
          {relaxedFilters.length > 0
            ? `（緩和: ${relaxedFilters.join(" → ")}）`
            : ""}
          。
        </p>
      ) : null}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          おすすめ {items.length} 件（スコア順）
        </p>
        <div className="flex flex-wrap gap-2">
          {top3Ids.length >= 2 ? (
            <Link
              href={top3CompareHref}
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              上位{Math.min(3, top3Ids.length)}件を比較
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center justify-center rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-800 transition-colors hover:border-teal-300 hover:bg-teal-50"
          >
            もう一度診断する
          </button>
        </div>
      </div>

      {limitMessage ? (
        <p
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          {limitMessage}
        </p>
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

      <p className="mt-4 text-xs text-gray-500">
        チェックで最大3機種を選んで比較できます。
      </p>

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

  return (
    <li>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
          <span className="text-xs font-medium tracking-wide text-teal-700">
            #{rank} · スコア {score}
          </span>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(earphone)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="font-medium">
              {isSelected ? "比較から外す" : "比較に追加"}
            </span>
          </label>
        </div>

        <Link href={detailHref} className="block transition-opacity hover:opacity-95">
          <RemoteImage
            src={earphone.image_url}
            alt={`${earphone.name} 商品画像`}
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
          <dl className="space-y-1 text-sm text-gray-600">
            <div className="flex gap-2">
              <dt className="font-medium text-gray-500">価格</dt>
              <dd className="font-medium tracking-tight">
                {formatPrice(earphone.price)}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-gray-500">カテゴリ</dt>
              <dd>{earphone.category}</dd>
            </div>
          </dl>

          <ul className="mt-3 flex flex-col gap-1">
            {reasons.map((reason) => (
              <li
                key={reason}
                className="text-xs leading-relaxed text-teal-800"
              >
                · {reason}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </li>
  );
}
