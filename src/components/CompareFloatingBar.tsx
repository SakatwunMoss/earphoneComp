"use client";

import Link from "next/link";

type CompareItem = {
  id: string;
  name: string;
  brand?: string;
};

type CompareFloatingBarProps = {
  selected: CompareItem[];
  compareHref: string;
  onRemove: (id: string) => void;
  onClear: () => void;
  /** 機種名の前にブランド名を併記する（横断比較用） */
  showBrand?: boolean;
};

export function CompareFloatingBar({
  selected,
  compareHref,
  onRemove,
  onClear,
  showBrand = false,
}: CompareFloatingBarProps) {
  if (selected.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-teal-200 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm"
      role="region"
      aria-label="比較中の機種"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-teal-700">
            比較中（{selected.length}/3）
          </p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {selected.map((item) => {
              const label =
                showBrand && item.brand
                  ? `${item.brand} ${item.name}`
                  : item.name;

              return (
                <li key={item.id}>
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs text-teal-900">
                    <span className="truncate">{label}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-teal-700 transition-colors hover:bg-teal-200/60 hover:text-teal-900"
                      aria-label={`${label}を比較から外す`}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path dName="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            クリア
          </button>
          <Link
            href={compareHref}
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            比較する
          </Link>
        </div>
      </div>
    </div>
  );
}
