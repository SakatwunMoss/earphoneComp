export const dynamic = "force-dynamic";

import Link from "next/link";

import { Card } from "@/components/Card";
import { supabase } from "@/lib/supabase";
import type { Earphone } from "@/types/database";

type PageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

function getQuery(q: string | string[] | undefined): string {
  if (Array.isArray(q)) {
    return q[0]?.trim() ?? "";
  }
  return q?.trim() ?? "";
}

function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}

async function searchEarphones(keyword: string): Promise<Earphone[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("earphones")
    .select("*")
    .or(
      `name.ilike.%${keyword}%,brand.ilike.%${keyword}%,form_factor.ilike.%${keyword}%`,
    );

  if (error) {
    console.error("Failed to search earphones:", error);
    return [];
  }

  return data ?? [];
}

export default async function SearchPage({ searchParams }: PageProps) {
  const keyword = getQuery((await searchParams).q);

  if (!keyword) {
    return (
      <div className="flex flex-1 flex-col px-6 py-10">
        <main className="mx-auto w-full max-w-6xl">
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
            検索キーワードを入力してください
          </p>
        </main>
      </div>
    );
  }

  const earphones = await searchEarphones(keyword);

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          「{keyword}」の検索結果
        </h1>

        {earphones.length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
            一致する結果が見つかりませんでした
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {earphones.map((earphone) => (
              <li key={earphone.id}>
                <Card href={`/earphones/${earphone.id}`}>
                  <h2 className="mb-2 text-lg font-medium tracking-tight text-gray-900">
                    {earphone.name}
                  </h2>
                  <dl className="space-y-1 text-sm text-gray-600">
                    <div className="flex gap-2">
                      <dt className="font-medium text-gray-500">ブランド</dt>
                      <dd>{earphone.brand}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium text-gray-500">形状</dt>
                      <dd>{earphone.form_factor}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium text-gray-500">価格</dt>
                      <dd className="font-medium tracking-tight">
                        {formatPrice(earphone.price)}
                      </dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>
        )}

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
