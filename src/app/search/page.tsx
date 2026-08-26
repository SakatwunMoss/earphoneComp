export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FilterPanel } from "@/components/FilterPanel";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { SearchCompareGrid } from "@/components/SearchCompareGrid";
import {
  applyEarphoneFilters,
  buildSearchOrFilter,
  parseEarphoneFilters,
  uniqueSortedCategories,
} from "@/lib/earphone-filters";
import { createPageMetadata } from "@/lib/site-metadata";
import { logSupabaseError } from "@/lib/supabase-error";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Earphone } from "@/types/database";

type PageProps = {
  searchParams: Promise<{
    q?: string | string[];
    category?: string | string[];
    nc?: string | string[];
    price?: string | string[];
    sort?: string | string[];
  }>;
};

/** 絞り込み・並び替え・検索語付き URL でも canonical は /search を指す */
export const metadata: Metadata = createPageMetadata({
  title: "検索",
  description:
    "イヤホンをキーワード・カテゴリ・価格などで検索。気になる機種を比較できます。",
  path: "/search",
});

function getQuery(q: string | string[] | undefined): string {
  if (Array.isArray(q)) {
    return q[0]?.trim() ?? "";
  }
  return q?.trim() ?? "";
}

async function searchEarphones(
  keyword: string,
  filters: ReturnType<typeof parseEarphoneFilters>,
): Promise<Earphone[]> {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("earphones")
    .select("*")
    .or(buildSearchOrFilter(keyword));

  query = applyEarphoneFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    logSupabaseError("Failed to search earphones:", error);
    return [];
  }

  return data ?? [];
}

async function getSearchCategories(keyword: string): Promise<string[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("earphones")
    .select("category")
    .or(buildSearchOrFilter(keyword));

  if (error) {
    logSupabaseError("Failed to fetch search categories:", error);
    return [];
  }

  return uniqueSortedCategories(data);
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const keyword = getQuery(params.q);
  const filters = parseEarphoneFilters(params);

  if (!keyword) {
    return (
      <div className="flex flex-1 flex-col px-6 py-10">
        <main className="mx-auto w-full max-w-6xl">
          <Breadcrumbs
            items={[{ label: "ホーム", href: "/" }, { label: "検索", href: "/search" }]}
          />
          <h1 className="mb-4 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            検索
          </h1>
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
            検索キーワードを入力してください
          </p>
        </main>
      </div>
    );
  }

  const [earphones, categories] = await Promise.all([
    searchEarphones(keyword, filters),
    getSearchCategories(keyword),
  ]);

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <Breadcrumbs
          items={[{ label: "ホーム", href: "/" }, { label: "検索", href: "/search" }]}
        />
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          「{keyword}」の検索結果
        </h1>
        <p className="mb-4 text-sm text-gray-600">
          {earphones.length} 件
          {!isSupabaseConfigured ? "（Supabase 未設定）" : null}
        </p>
        <PriceDisclaimer className="mb-8" />

        <FilterPanel categories={categories}>
          {earphones.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
              該当する機種が見つかりませんでした
            </p>
          ) : (
            <SearchCompareGrid earphones={earphones} />
          )}
        </FilterPanel>

        <p className="mt-8">
          <Link
            href="/"
            className="text-sm text-gray-600 transition-colors hover:text-teal-700"
          >
            ← 一覧に戻る
          </Link>
        </p>
      </main>
    </div>
  );
}
