export const dynamic = "force-dynamic";

import { Card } from "@/components/Card";
import { logSupabaseError } from "@/lib/supabase-error";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Earphone } from "@/types/database";

async function getEarphones(): Promise<{
  earphones: Earphone[] | null;
  error: string | null;
}> {
  if (!supabase) {
    return { earphones: [], error: null };
  }

  const { data, error } = await supabase
    .from("earphones")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logSupabaseError("Failed to fetch earphones:", error);
    return { earphones: null, error: error.message };
  }

  return { earphones: data ?? [], error: null };
}

function formatPrice(price: number | null): string {
  if (price == null) {
    return "—";
  }
  return `¥${price.toLocaleString("ja-JP")}`;
}

export default async function Home() {
  const { earphones, error } = await getEarphones();

  return (
    <div className="flex flex-1 flex-col">
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
            気になるイヤホンを比較しよう
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
            ブランド・カテゴリ・価格からイヤホンを一覧で比較できるサイトです。
          </p>
        </div>
      </section>

      <div className="px-6 py-10">
        <main className="mx-auto w-full max-w-6xl">
          {!isSupabaseConfigured ? (
            <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
              Supabase の環境変数が未設定です。.env.local.example
              を参考に .env.local を作成してください。
            </p>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              データの取得に失敗しました。しばらくしてから再度お試しください。
            </p>
          ) : earphones && earphones.length > 0 ? (
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
                        <dt className="font-medium text-gray-500">カテゴリ</dt>
                        <dd>{earphone.category}</dd>
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
