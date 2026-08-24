export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BrandCompareGrid } from "@/components/BrandCompareGrid";
import { FilterPanel } from "@/components/FilterPanel";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import {
  applyEarphoneFilters,
  parseEarphoneFilters,
  uniqueSortedCategories,
  type EarphoneFilterState,
} from "@/lib/earphone-filters";
import { brandFromUrlParam, brandPagePath } from "@/lib/brand-url";
import { createPageMetadata } from "@/lib/site-metadata";
import { logSupabaseError } from "@/lib/supabase-error";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Earphone } from "@/types/database";

type PageProps = {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{
    category?: string | string[];
    nc?: string | string[];
    price?: string | string[];
    sort?: string | string[];
  }>;
};

const DEFAULT_FILTERS: EarphoneFilterState = {
  categories: [],
  nc: false,
  price: null,
  sort: "name_asc",
};

async function getBrandCategories(brand: string): Promise<string[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("earphones")
    .select("category")
    .eq("brand", brand);

  if (error) {
    logSupabaseError("Failed to fetch brand categories:", error);
    return [];
  }

  return uniqueSortedCategories(data);
}

async function getEarphonesByBrand(
  brand: string,
  filters: EarphoneFilterState,
): Promise<{
  earphones: Earphone[] | null;
  error: string | null;
}> {
  if (!supabase) {
    return { earphones: [], error: null };
  }

  let query = supabase.from("earphones").select("*").eq("brand", brand);
  query = applyEarphoneFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    logSupabaseError("Failed to fetch earphones by brand:", error);
    return { earphones: null, error: error.message };
  }

  return { earphones: data ?? [], error: null };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand: brandParam } = await params;
  const brand = brandFromUrlParam(brandParam);

  return createPageMetadata({
    title: `${brand}のイヤホン一覧`,
    description: `${brand}ブランドのイヤホンを一覧・比較。価格やスペックを確認できます。`,
    path: brandPagePath(brand),
  });
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { brand: brandParam } = await params;
  const brand = brandFromUrlParam(brandParam);
  const filters = parseEarphoneFilters(await searchParams);

  const [categories, { earphones, error }] = await Promise.all([
    getBrandCategories(brand),
    getEarphonesByBrand(brand, filters),
  ]);

  if (
    isSupabaseConfigured &&
    !error &&
    categories.length === 0 &&
    (earphones?.length ?? 0) === 0
  ) {
    // フィルターなしでも0件ならブランド自体が存在しない
    const hasActiveFilters =
      filters.categories.length > 0 || filters.nc || filters.price != null;
    if (!hasActiveFilters) {
      notFound();
    } else {
      const { earphones: allForBrand } = await getEarphonesByBrand(
        brand,
        DEFAULT_FILTERS,
      );
      if ((allForBrand?.length ?? 0) === 0) {
        notFound();
      }
    }
  }

  const hasActiveFilters =
    filters.categories.length > 0 || filters.nc || filters.price != null;

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <Breadcrumbs
          items={[{ label: "ホーム", href: "/" }, { label: brand }]}
        />

        <header className="mb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {brand}
          </h1>
          {earphones ? (
            <p className="mt-2 text-sm text-gray-600">
              {earphones.length} 機種
              {hasActiveFilters ? "（絞り込み後）" : "を登録中"}
            </p>
          ) : null}
        </header>
        <PriceDisclaimer className="mb-8" />

        {!isSupabaseConfigured ? (
          <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            Supabase の環境変数が未設定です。
          </p>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            データの取得に失敗しました。しばらくしてから再度お試しください。
          </p>
        ) : (
          <FilterPanel categories={categories}>
            {earphones && earphones.length > 0 ? (
              <BrandCompareGrid brand={brand} earphones={earphones} />
            ) : (
              <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
                該当する機種が見つかりませんでした
              </p>
            )}
          </FilterPanel>
        )}
      </main>
    </div>
  );
}
