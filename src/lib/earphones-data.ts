import type { Earphone } from "@/types/database";

import {
  applyEarphoneFiltersToList,
  matchesEarphoneKeyword,
  uniqueSortedCategories,
  type EarphoneFilterState,
} from "@/lib/earphone-filters";
import { brandToUrlParam } from "@/lib/brand-url";
import earphonesData from "@/data/earphones.json";

export type EarphonesCatalog = {
  generated_at: string;
  count: number;
  earphones: Earphone[];
};

const catalog = earphonesData as EarphonesCatalog;

export function getCatalogGeneratedAt(): string {
  return catalog.generated_at;
}

/** 画面表示用「最終更新: yyyy/mm/dd hh:mm」（JST） */
export function formatCatalogUpdatedAt(
  iso = catalog.generated_at,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

export function getAllEarphones(): Earphone[] {
  return catalog.earphones;
}

export function getEarphoneById(id: string): Earphone | undefined {
  return catalog.earphones.find((earphone) => earphone.id === id);
}

export function getEarphonesByBrand(brand: string): Earphone[] {
  return catalog.earphones.filter((earphone) => earphone.brand === brand);
}

export function getEarphonesByIds(ids: string[]): Earphone[] {
  const byId = new Map(
    catalog.earphones.map((earphone) => [earphone.id, earphone]),
  );
  const ordered: Earphone[] = [];
  for (const id of ids) {
    const earphone = byId.get(id);
    if (earphone) {
      ordered.push(earphone);
    }
  }
  return ordered;
}

export function getBrandSummaries(): { brand: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const earphone of catalog.earphones) {
    counts.set(earphone.brand, (counts.get(earphone.brand) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) =>
      a.brand.localeCompare(b.brand, "en", { sensitivity: "base" }),
    );
}

export function getBrandNames(): string[] {
  return getBrandSummaries().map((row) => row.brand);
}

export function getCategoriesForBrand(brand: string): string[] {
  return uniqueSortedCategories(getEarphonesByBrand(brand));
}

export function filterEarphonesByBrand(
  brand: string,
  filters: EarphoneFilterState,
): Earphone[] {
  return applyEarphoneFiltersToList(getEarphonesByBrand(brand), filters);
}

export function searchEarphones(
  keyword: string,
  filters: EarphoneFilterState,
): Earphone[] {
  const matched = catalog.earphones.filter((earphone) =>
    matchesEarphoneKeyword(earphone, keyword),
  );
  return applyEarphoneFiltersToList(matched, filters);
}

export function getCategoriesForSearch(keyword: string): string[] {
  const matched = catalog.earphones.filter((earphone) =>
    matchesEarphoneKeyword(earphone, keyword),
  );
  return uniqueSortedCategories(matched);
}

export function findEarphoneByBrandAndName(
  brand: string,
  name: string,
): Earphone | undefined {
  return catalog.earphones.find(
    (earphone) => earphone.brand === brand && earphone.name === name,
  );
}

export function getStaticBrandParams(): { brand: string }[] {
  return getBrandNames().map((brand) => ({
    brand: brandToUrlParam(brand),
  }));
}

export function getStaticEarphoneParams(): { brand: string; id: string }[] {
  return catalog.earphones.map((earphone) => ({
    brand: brandToUrlParam(earphone.brand),
    id: earphone.id,
  }));
}
