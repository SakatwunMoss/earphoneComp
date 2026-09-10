import type { Earphone } from "@/types/database";

export type SortOption = "price_asc" | "price_desc" | "name_asc";

export type PriceRangeId =
  | "under_5000"
  | "5000_15000"
  | "15000_30000"
  | "over_30000";

export type EarphoneFilterState = {
  categories: string[];
  nc: boolean;
  price: PriceRangeId | null;
  sort: SortOption;
};

export const PRICE_RANGES: {
  id: PriceRangeId;
  label: string;
  min?: number;
  max?: number;
}[] = [
  { id: "under_5000", label: "〜5,000円", max: 5000 },
  { id: "5000_15000", label: "5,000〜15,000円", min: 5000, max: 15000 },
  { id: "15000_30000", label: "15,000〜30,000円", min: 15000, max: 30000 },
  { id: "over_30000", label: "30,000円〜", min: 30000 },
];

export const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "name_asc", label: "名前順" },
  { id: "price_asc", label: "価格が安い順" },
  { id: "price_desc", label: "価格が高い順" },
];

const PRICE_IDS = new Set<string>(PRICE_RANGES.map((r) => r.id));
const SORT_IDS = new Set<string>(SORT_OPTIONS.map((o) => o.id));

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseCategories(
  value: string | string[] | undefined,
): string[] {
  if (value == null) {
    return [];
  }
  const raw = Array.isArray(value) ? value : value.split(",");
  return [
    ...new Set(
      raw
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function parseEarphoneFilters(
  searchParams: Record<string, string | string[] | undefined>,
): EarphoneFilterState {
  const priceRaw = firstParam(searchParams.price);
  const sortRaw = firstParam(searchParams.sort);
  const ncRaw = firstParam(searchParams.nc);

  return {
    categories: parseCategories(searchParams.category),
    nc: ncRaw === "true",
    price:
      priceRaw && PRICE_IDS.has(priceRaw)
        ? (priceRaw as PriceRangeId)
        : null,
    sort:
      sortRaw && SORT_IDS.has(sortRaw)
        ? (sortRaw as SortOption)
        : "name_asc",
  };
}

/**
 * PostgreSQL ILIKE 相当の部分一致。
 * - 大文字小文字は区別しない（ASCII）
 * - 全角・半角は正規化しない（ILIKE と同じく区別する）
 * - null の description は不一致（ILIKE と同じ）
 */
export function matchesEarphoneKeyword(
  earphone: Pick<Earphone, "name" | "brand" | "description">,
  keyword: string,
): boolean {
  const needle = keyword.trim().toLocaleLowerCase("en-US");
  if (!needle) {
    return false;
  }

  const fields = [earphone.name, earphone.brand, earphone.description];
  return fields.some((field) => {
    if (field == null) {
      return false;
    }
    return field.toLocaleLowerCase("en-US").includes(needle);
  });
}

function compareNullablePrice(
  a: number | null,
  b: number | null,
  ascending: boolean,
): number {
  // PostgREST nullsFirst: false → nulls last
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return ascending ? a - b : b - a;
}

export function applyEarphoneFiltersToList(
  earphones: Earphone[],
  filters: EarphoneFilterState,
): Earphone[] {
  let next = earphones;

  if (filters.categories.length > 0) {
    const allowed = new Set(filters.categories);
    next = next.filter((earphone) => allowed.has(earphone.category));
  }

  if (filters.nc) {
    next = next.filter((earphone) => earphone.noise_cancelling);
  }

  if (filters.price) {
    const range = PRICE_RANGES.find((r) => r.id === filters.price);
    if (range) {
      next = next.filter((earphone) => {
        if (earphone.price == null) {
          return false;
        }
        if (range.min != null && earphone.price < range.min) {
          return false;
        }
        if (range.max != null && earphone.price > range.max) {
          return false;
        }
        return true;
      });
    }
  }

  const sorted = [...next];
  if (filters.sort === "price_asc") {
    sorted.sort((a, b) => compareNullablePrice(a.price, b.price, true));
  } else if (filters.sort === "price_desc") {
    sorted.sort((a, b) => compareNullablePrice(a.price, b.price, false));
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name, "en"));
  }

  return sorted;
}

export function uniqueSortedCategories(
  rows: { category: string }[] | null | undefined,
): string[] {
  return [
    ...new Set((rows ?? []).map((row) => row.category).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "ja"));
}
