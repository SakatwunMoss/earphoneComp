import Link from "next/link";
import type { ReactNode } from "react";

import { earphonePagePath } from "@/lib/brand-url";
import { formatPrice } from "@/lib/format";
import type { Earphone } from "@/types/database";

type CompareRow = {
  key: string;
  label: string;
  render: (earphone: Earphone) => ReactNode;
  isPrice?: boolean;
};

const BASE_COMPARE_ROWS: CompareRow[] = [
  {
    key: "name",
    label: "機種名",
    render: (earphone) => earphone.name,
  },
  {
    key: "price",
    label: "価格",
    isPrice: true,
    render: (earphone) => formatPrice(earphone.price),
  },
  {
    key: "category",
    label: "カテゴリ",
    render: (earphone) => earphone.category,
  },
  {
    key: "noise_cancelling",
    label: "ノイズキャンセリング",
    render: (earphone) => (
      <BooleanIndicator value={earphone.noise_cancelling} />
    ),
  },
  {
    key: "battery_life",
    label: "バッテリー",
    render: (earphone) => earphone.battery_life ?? "—",
  },
  {
    key: "water_resistance",
    label: "防水",
    render: (earphone) => earphone.water_resistance ?? "—",
  },
  {
    key: "description",
    label: "説明",
    render: (earphone) =>
      earphone.description?.trim() ? earphone.description : "—",
  },
];

const BRAND_ROW: CompareRow = {
  key: "brand",
  label: "ブランド",
  render: (earphone) => earphone.brand,
};

function BooleanIndicator({ value }: { value: boolean }) {
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-teal-700">
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-xs"
        >
          ○
        </span>
        対応
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-gray-500">
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs"
      >
        ×
      </span>
      非対応
    </span>
  );
}

function getLowestPrice(earphones: Earphone[]): number | null {
  const prices = earphones
    .map((earphone) => earphone.price)
    .filter((price): price is number => price != null);

  if (prices.length === 0) {
    return null;
  }

  return Math.min(...prices);
}

type CompareTableProps = {
  earphones: Earphone[];
  /** ブランド内比較では省略。横断比較では brand 行を先頭に表示 */
  showBrandColumn?: boolean;
  /** 詳細リンク用。未指定時は各機種の brand を使う */
  brand?: string;
};

export function CompareTable({
  earphones,
  showBrandColumn = false,
  brand,
}: CompareTableProps) {
  const lowestPrice = getLowestPrice(earphones);
  const rows = showBrandColumn
    ? [BRAND_ROW, ...BASE_COMPARE_ROWS]
    : BASE_COMPARE_ROWS;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="border-b border-gray-200 bg-teal-50/60 text-gray-600">
          <tr>
            <th className="sticky left-0 z-10 min-w-[7rem] bg-teal-50/95 px-4 py-3 font-medium backdrop-blur-sm">
              項目
            </th>
            {earphones.map((earphone) => {
              const linkBrand = brand ?? earphone.brand;
              const heading = showBrandColumn
                ? `${earphone.brand} ${earphone.name}`
                : earphone.name;

              return (
                <th
                  key={earphone.id}
                  className="min-w-[10rem] px-4 py-3 font-medium text-gray-900"
                >
                  <Link
                    href={earphonePagePath(linkBrand, earphone.id)}
                    className="transition-colors hover:text-teal-700"
                  >
                    {heading}
                  </Link>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-700">
          {rows.map((row) => (
            <tr key={row.key}>
              <th className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-gray-500">
                {row.label}
              </th>
              {earphones.map((earphone) => {
                const isLowestPrice =
                  row.isPrice &&
                  lowestPrice != null &&
                  earphone.price === lowestPrice;

                return (
                  <td
                    key={earphone.id}
                    className={`px-4 py-3 align-top ${
                      isLowestPrice
                        ? "bg-teal-50 font-semibold text-teal-900"
                        : ""
                    } ${row.key === "description" ? "max-w-xs whitespace-pre-wrap" : ""}`}
                  >
                    {row.render(earphone)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
