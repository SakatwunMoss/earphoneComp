import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/Card";
import { RemoteImage } from "@/components/RemoteImage";
import { brandFromUrlParam, brandPagePath, earphonePagePath } from "@/lib/brand-url";
import { formatBoolean, formatPrice } from "@/lib/format";
import { createPageMetadata } from "@/lib/site-metadata";
import { logSupabaseError } from "@/lib/supabase-error";
import { supabase } from "@/lib/supabase";
import type { Earphone } from "@/types/database";

type PageProps = {
  params: Promise<{ brand: string; id: string }>;
};

async function getEarphone(id: string): Promise<Earphone | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("earphones")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logSupabaseError("Failed to fetch earphone:", error);
    return null;
  }

  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand: brandParam, id } = await params;
  const brand = brandFromUrlParam(brandParam);
  const earphone = await getEarphone(id);

  if (!earphone || earphone.brand !== brand) {
    return { title: "イヤホンが見つかりません" };
  }

  const description =
    earphone.description?.trim() ||
    `${earphone.name}のスペック・価格を確認。${brand}のイヤホン詳細ページです。`;

  return createPageMetadata({
    title: `${earphone.name}（${brand}）`,
    description,
    path: earphonePagePath(brand, id),
  });
}

export default async function EarphoneDetailPage({ params }: PageProps) {
  const { brand: brandParam, id } = await params;
  const brand = brandFromUrlParam(brandParam);
  const earphone = await getEarphone(id);

  if (!earphone || earphone.brand !== brand) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: brand, href: brandPagePath(brand) },
            { label: earphone.name },
          ]}
        />

        <header className="mb-8">
          <Card className="p-6">
            <div className="mb-6 max-w-md">
              <RemoteImage
                src={earphone.image_url}
                alt={earphone.name}
                className="h-auto w-full max-w-md object-contain"
                width={448}
                height={448}
                placeholderClassName="aspect-square w-full max-w-md"
              />
            </div>
            <h1 className="mb-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              {earphone.name}
            </h1>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
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
        </header>

        {earphone.description?.trim() ? (
          <section aria-labelledby="description-heading" className="mb-8">
            <h2
              id="description-heading"
              className="mb-3 text-xl font-medium text-gray-900"
            >
              説明
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
              {earphone.description}
            </p>
          </section>
        ) : null}

        <section aria-labelledby="specs-heading">
          <h2
            id="specs-heading"
            className="mb-3 text-xl font-medium text-gray-900"
          >
            スペック
          </h2>
          <p className="mb-3 text-xs text-gray-400">
            ※表示価格は変動する場合があります。購入の際は各販売元の最新価格をご確認ください。
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-gray-200 bg-teal-50/60 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">項目</th>
                  <th className="px-4 py-3 font-medium">内容</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">
                    機種名
                  </th>
                  <td className="px-4 py-3">{earphone.name}</td>
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">
                    ブランド
                  </th>
                  <td className="px-4 py-3">{earphone.brand}</td>
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">価格</th>
                  <td className="px-4 py-3 font-medium tracking-tight">
                    {formatPrice(earphone.price)}
                  </td>
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">
                    カテゴリ
                  </th>
                  <td className="px-4 py-3">{earphone.category}</td>
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">
                    ノイズキャンセリング
                  </th>
                  <td className="px-4 py-3">
                    {formatBoolean(earphone.noise_cancelling)}
                  </td>
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">
                    バッテリー
                  </th>
                  <td className="px-4 py-3">{earphone.battery_life ?? "—"}</td>
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">防水</th>
                  <td className="px-4 py-3">
                    {earphone.water_resistance ?? "—"}
                  </td>
                </tr>
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500 align-top">
                    説明
                  </th>
                  <td className="px-4 py-3">
                    {earphone.description?.trim() ? earphone.description : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {earphone.url ? (
            <p className="mt-6">
              <a
                href={earphone.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-teal-600 underline-offset-2 transition-colors hover:text-teal-700 hover:underline"
              >
                購入先を見る →
              </a>
            </p>
          ) : null}
        </section>

        <p className="mt-8">
          <Link
            href={brandPagePath(brand)}
            className="text-sm font-medium text-teal-600 transition-colors hover:text-teal-700"
          >
            このブランドの他の機種を見る →
          </Link>
        </p>
      </main>
    </div>
  );
}
