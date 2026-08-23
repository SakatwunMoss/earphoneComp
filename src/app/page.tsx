export const dynamic = "force-dynamic";

import Image from "next/image";

import { BrandLogo } from "@/components/BrandLogo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/Card";
import { brandPagePath } from "@/lib/brand-url";
import { logSupabaseError } from "@/lib/supabase-error";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type BrandSummary = {
  brand: string;
  count: number;
};

async function getBrands(): Promise<{
  brands: BrandSummary[] | null;
  error: string | null;
}> {
  if (!supabase) {
    return { brands: [], error: null };
  }

  const { data, error } = await supabase.from("earphones").select("brand");

  if (error) {
    logSupabaseError("Failed to fetch brands:", error);
    return { brands: null, error: error.message };
  }

  const rows = (data ?? []) as { brand: string }[];
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.brand, (counts.get(row.brand) ?? 0) + 1);
  }

  const brands = [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) =>
      a.brand.localeCompare(b.brand, "en", { sensitivity: "base" }),
    );

  return { brands, error: null };
}

export default async function Home() {
  const { brands, error } = await getBrands();

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full">
        <Image
          src="/images/hero.jpg"
          alt="Earphone Compare — メーカーからイヤホンを探そう"
          width={1584}
          height={672}
          priority
          className="h-auto w-full"
        />
      </div>

      <section
        aria-labelledby="hero-heading"
        className="w-full border-b border-teal-100 bg-teal-50"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3 px-6 py-12 sm:py-16">
          <p className="text-sm font-medium tracking-wide text-teal-700">
            Earphone Compare
          </p>
          <h1
            id="hero-heading"
            className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl"
          >
            メーカーからイヤホンを探そう
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            ブランドごとに登録機種を一覧できます。気になるメーカーを選んで比較してください。
          </p>
        </div>
      </section>

      <div className="px-6 py-10">
        <main className="mx-auto w-full max-w-6xl">
          <Breadcrumbs items={[{ label: "ホーム" }]} />

          {!isSupabaseConfigured ? (
            <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
              Supabase の環境変数が未設定です。.env.local.example
              を参考に .env.local を作成してください。
            </p>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              データの取得に失敗しました。しばらくしてから再度お試しください。
            </p>
          ) : brands && brands.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {brands.map(({ brand, count }) => (
                <li key={brand} className="flex">
                  <Card
                    href={brandPagePath(brand)}
                    className="flex h-full w-full flex-col"
                  >
                    <BrandLogo brand={brand} />
                    <h2 className="mb-2 text-lg font-medium tracking-tight text-gray-900">
                      {brand}
                    </h2>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-teal-700">{count}</span>
                      <span className="text-gray-500"> 機種</span>
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
              データがありません
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
