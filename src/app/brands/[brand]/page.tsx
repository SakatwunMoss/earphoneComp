export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/Card";
import { brandFromUrlParam, brandPagePath, earphonePagePath } from "@/lib/brand-url";
import { formatPrice } from "@/lib/format";
import { createPageMetadata } from "@/lib/site-metadata";
import { logSupabaseError } from "@/lib/supabase-error";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Earphone } from "@/types/database";

type PageProps = {
  params: Promise<{ brand: string }>;
};

async function getEarphonesByBrand(brand: string): Promise<{
  earphones: Earphone[] | null;
  error: string | null;
}> {
  if (!supabase) {
    return { earphones: [], error: null };
  }

  const { data, error } = await supabase
    .from("earphones")
    .select("*")
    .eq("brand", brand)
    .order("name", { ascending: true });

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

export default async function BrandPage({ params }: PageProps) {
  const { brand: brandParam } = await params;
  const brand = brandFromUrlParam(brandParam);
  const { earphones, error } = await getEarphonesByBrand(brand);

  if (!error && isSupabaseConfigured && earphones?.length === 0) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <Breadcrumbs
          items={[{ label: "ホーム", href: "/" }, { label: brand }]}
        />

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {brand}
          </h1>
          {earphones && earphones.length > 0 ? (
            <p className="mt-2 text-sm text-gray-600">
              {earphones.length} 機種を登録中
            </p>
          ) : null}
        </header>

        {!isSupabaseConfigured ? (
          <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            Supabase の環境変数が未設定です。
          </p>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            データの取得に失敗しました。しばらくしてから再度お試しください。
          </p>
        ) : earphones && earphones.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {earphones.map((earphone) => (
              <li key={earphone.id}>
                <Card href={earphonePagePath(brand, earphone.id)}>
                  <h2 className="mb-2 text-lg font-medium tracking-tight text-gray-900">
                    {earphone.name}
                  </h2>
                  <dl className="space-y-1 text-sm text-gray-600">
                    <div className="flex gap-2">
                      <dt className="font-medium text-gray-500">価格</dt>
                      <dd className="font-medium tracking-tight">
                        {formatPrice(earphone.price)}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium text-gray-500">カテゴリ</dt>
                      <dd>{earphone.category}</dd>
                    </div>
                  </dl>
                  {earphone.description?.trim() ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-500">
                      {earphone.description}
                    </p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
