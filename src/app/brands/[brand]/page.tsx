import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BrandCompareGrid } from "@/components/BrandCompareGrid";
import { FilterPanel } from "@/components/FilterPanel";
import { JsonLd } from "@/components/JsonLd";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import {
  parseEarphoneFilters,
  type EarphoneFilterState,
} from "@/lib/earphone-filters";
import { brandFromUrlParam, brandPagePath } from "@/lib/brand-url";
import {
  filterEarphonesByBrand,
  getCategoriesForBrand,
  getEarphonesByBrand,
  getStaticBrandParams,
} from "@/lib/earphones-data";
import { buildItemListJsonLd } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/site-metadata";

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

export function generateStaticParams() {
  return getStaticBrandParams();
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

  const allForBrand = getEarphonesByBrand(brand);
  if (allForBrand.length === 0) {
    notFound();
  }

  const categories = getCategoriesForBrand(brand);
  const earphones = filterEarphonesByBrand(brand, filters);
  const hasActiveFilters =
    filters.categories.length > 0 || filters.nc || filters.price != null;

  // フィルタで0件でもブランド自体は存在する（DEFAULT で確認済み）
  if (hasActiveFilters && earphones.length === 0) {
    const baseline = filterEarphonesByBrand(brand, DEFAULT_FILTERS);
    if (baseline.length === 0) {
      notFound();
    }
  }

  const itemListJsonLd =
    earphones.length > 0 ? buildItemListJsonLd(brand, earphones) : null;

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        {itemListJsonLd ? <JsonLd data={itemListJsonLd} /> : null}
        <Breadcrumbs
          items={[{ label: "ホーム", href: "/" }, { label: brand, href: brandPagePath(brand) }]}
        />

        <header className="mb-4">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {brand}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {earphones.length} 機種
            {hasActiveFilters ? "（絞り込み後）" : "を登録中"}
          </p>
        </header>
        <PriceDisclaimer className="mb-8" />

        <FilterPanel categories={categories}>
          {earphones.length > 0 ? (
            <BrandCompareGrid brand={brand} earphones={earphones} />
          ) : (
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
              該当する機種が見つかりませんでした
            </p>
          )}
        </FilterPanel>
      </main>
    </div>
  );
}
