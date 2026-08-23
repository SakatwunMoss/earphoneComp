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

/** PostgREST `.or()` 用に ilike パターンを安全にクォートする */
export function buildSearchOrFilter(keyword: string): string {
  const escaped = keyword.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const pattern = `%${escaped}%`;
  return `name.ilike."${pattern}",brand.ilike."${pattern}",description.ilike."${pattern}"`;
}

export function applyEarphoneFilters<
  T extends {
    in: (column: string, values: string[]) => T;
    eq: (column: string, value: boolean) => T;
    gte: (column: string, value: number) => T;
    lte: (column: string, value: number) => T;
    order: (
      column: string,
      options?: { ascending?: boolean; nullsFirst?: boolean },
    ) => T;
  },
>(query: T, filters: EarphoneFilterState): T {
  let next = query;

  if (filters.categories.length > 0) {
    next = next.in("category", filters.categories);
  }

  if (filters.nc) {
    next = next.eq("noise_cancelling", true);
  }

  if (filters.price) {
    const range = PRICE_RANGES.find((r) => r.id === filters.price);
    if (range?.min != null) {
      next = next.gte("price", range.min);
    }
    if (range?.max != null) {
      next = next.lte("price", range.max);
    }
  }

  if (filters.sort === "price_asc") {
    next = next.order("price", { ascending: true, nullsFirst: false });
  } else if (filters.sort === "price_desc") {
    next = next.order("price", { ascending: false, nullsFirst: false });
  } else {
    next = next.order("name", { ascending: true });
  }

  return next;
}

export function uniqueSortedCategories(
  rows: { category: string }[] | null | undefined,
): string[] {
  return [
    ...new Set((rows ?? []).map((row) => row.category).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "ja"));
}
