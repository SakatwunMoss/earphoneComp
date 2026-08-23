"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  PRICE_RANGES,
  SORT_OPTIONS,
  type PriceRangeId,
  type SortOption,
} from "@/lib/earphone-filters";

type FilterPanelProps = {
  categories: string[];
  children: ReactNode;
};

function countActiveFilters(searchParams: URLSearchParams): number {
  let count = 0;
  if (searchParams.get("category")) count += 1;
  if (searchParams.get("nc") === "true") count += 1;
  if (searchParams.get("price")) count += 1;
  const sort = searchParams.get("sort");
  if (sort && sort !== "name_asc") count += 1;
  return count;
}

function FilterPanelInner({ categories, children }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const titleId = useId();
  const activeCount = countActiveFilters(searchParams);

  const selectedCategories = (searchParams.get("category") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const ncOn = searchParams.get("nc") === "true";
  const price = searchParams.get("price") as PriceRangeId | null;
  const sort = (searchParams.get("sort") as SortOption | null) ?? "name_asc";

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  function toggleCategory(category: string) {
    pushParams((params) => {
      const current = (params.get("category") ?? "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const next = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      if (next.length === 0) {
        params.delete("category");
      } else {
        params.set("category", next.join(","));
      }
    });
  }

  function setNc(enabled: boolean) {
    pushParams((params) => {
      if (enabled) {
        params.set("nc", "true");
      } else {
        params.delete("nc");
      }
    });
  }

  function setPrice(value: string) {
    pushParams((params) => {
      if (!value) {
        params.delete("price");
      } else {
        params.set("price", value);
      }
    });
  }

  function setSort(value: string) {
    pushParams((params) => {
      if (!value || value === "name_asc") {
        params.delete("sort");
      } else {
        params.set("sort", value);
      }
    });
  }

  function clearFilters() {
    pushParams((params) => {
      params.delete("category");
      params.delete("nc");
      params.delete("price");
      params.delete("sort");
    });
  }

  function renderFilters(idPrefix: string, headingId?: string) {
    const priceId = `${idPrefix}-price`;
    const sortId = `${idPrefix}-sort`;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2
            id={headingId}
            className="text-sm font-semibold text-gray-900"
          >
            絞り込み
          </h2>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-teal-700 transition-colors hover:text-teal-800"
            >
              クリア
            </button>
          ) : null}
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-medium tracking-wide text-gray-500">
            カテゴリ
          </legend>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">カテゴリがありません</p>
          ) : (
            <ul className="space-y-2">
              {categories.map((category) => {
                const checked = selectedCategories.includes(category);
                const id = `${idPrefix}-category-${category}`;
                return (
                  <li key={category}>
                    <label
                      htmlFor={id}
                      className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(category)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>{category}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        <div className="space-y-2">
          <div className="text-xs font-medium tracking-wide text-gray-500">
            ノイズキャンセリング
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <span className="text-sm text-gray-700">NC対応のみ表示</span>
            <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
              <input
                type="checkbox"
                role="switch"
                checked={ncOn}
                onChange={(event) => setNc(event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-teal-600 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-400/50" />
              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={priceId}
            className="block text-xs font-medium tracking-wide text-gray-500"
          >
            価格帯
          </label>
          <select
            id={priceId}
            value={
              price && PRICE_RANGES.some((r) => r.id === price) ? price : ""
            }
            onChange={(event) => setPrice(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40"
          >
            <option value="">すべて</option>
            {PRICE_RANGES.map((range) => (
              <option key={range.id} value={range.id}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={sortId}
            className="block text-xs font-medium tracking-wide text-gray-500"
          >
            並び替え
          </label>
          <select
            id={sortId}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-teal-400 focus:ring-1 focus:ring-teal-400/40"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="w-full shrink-0 lg:w-64">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-800 transition-colors hover:border-teal-300 hover:bg-teal-100/70"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            絞り込み
            {activeCount > 0 ? (
              <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
            <button
              type="button"
              aria-label="絞り込みパネルを閉じる"
              className="absolute inset-0 bg-gray-900/40"
              onClick={() => setDrawerOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="text-sm font-semibold text-gray-900">
                  絞り込み
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <span className="sr-only">閉じる</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {renderFilters("filter-drawer", titleId)}
              </div>
              <div className="border-t border-gray-100 p-4">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                >
                  結果を見る
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <aside
          className={`hidden rounded-xl border border-gray-200 bg-teal-50/40 p-4 lg:block ${
            isPending ? "opacity-70" : ""
          }`}
          aria-labelledby={titleId}
          aria-busy={isPending}
        >
          {renderFilters("filter-desktop", titleId)}
        </aside>
      </div>

      <div
        className={`relative min-w-0 flex-1 ${isPending ? "opacity-60" : ""}`}
        aria-busy={isPending}
      >
        {isPending ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-16"
            aria-live="polite"
          >
            <span className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white/95 px-3 py-2 text-sm text-teal-800 shadow-sm">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"
                aria-hidden="true"
              />
              絞り込み中…
            </span>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function FilterPanelFallback({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="w-full shrink-0 lg:w-64">
        <div className="h-10 w-full animate-pulse rounded-xl bg-teal-50 lg:hidden" />
        <aside className="hidden animate-pulse rounded-xl border border-gray-200 bg-teal-50/40 p-4 lg:block">
          <div className="mb-6 h-4 w-20 rounded bg-teal-100" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
            <div className="h-10 w-full rounded-xl bg-gray-200" />
          </div>
        </aside>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** 一覧ページ共通の絞り込みパネル（デスクトップ: サイドバー / モバイル: ドロワー） */
export function FilterPanel({ categories, children }: FilterPanelProps) {
  return (
    <Suspense fallback={<FilterPanelFallback>{children}</FilterPanelFallback>}>
      <FilterPanelInner categories={categories}>{children}</FilterPanelInner>
    </Suspense>
  );
}
