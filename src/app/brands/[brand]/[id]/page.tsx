import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AffiliateActions } from "@/components/AffiliateActions";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/Card";
import { JsonLd } from "@/components/JsonLd";
import { PromotionNote } from "@/components/PromotionNote";
import { RemoteImage } from "@/components/RemoteImage";
import { hasAffiliateLink } from "@/lib/affiliate-display";
import { brandFromUrlParam, brandPagePath, earphonePagePath } from "@/lib/brand-url";
import {
  getEarphoneById,
  getStaticEarphoneParams,
} from "@/lib/earphones-data";
import { formatBoolean, formatPrice } from "@/lib/format";
import { buildProductJsonLd } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/site-metadata";

type PageProps = {
  params: Promise<{ brand: string; id: string }>;
};

export function generateStaticParams() {
  return getStaticEarphoneParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand: brandParam, id } = await params;
  const brand = brandFromUrlParam(brandParam);
  const earphone = getEarphoneById(id);

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
  const earphone = getEarphoneById(id);

  if (!earphone || earphone.brand !== brand) {
    notFound();
  }

  const productJsonLd = buildProductJsonLd(earphone);
  const showAffiliate = hasAffiliateLink(earphone);

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <JsonLd data={productJsonLd} />
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: brand, href: brandPagePath(brand) },
            { label: earphone.name, href: earphonePagePath(brand, id) },
          ]}
        />

        <header className="mb-8">
          <Card className="p-6">
            <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:items-start">
              <div className="order-2 max-w-md md:order-1">
                <RemoteImage
                  src={earphone.image_url}
                  alt={`${earphone.name} 商品画像`}
                  className="h-auto w-full max-w-md object-contain"
                  width={448}
                  height={448}
                  placeholderClassName="aspect-square w-full max-w-md"
                />
              </div>
              <div className="order-1 md:order-2">
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
                {showAffiliate ? (
                  <PromotionNote className="mt-4" />
                ) : null}
                <AffiliateActions
                  product={earphone}
                  placement="detail_top"
                  className="mt-4"
                />
              </div>
            </div>
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
        </section>

        {earphone.long_description?.trim() ? (
          <section
            aria-labelledby="long-description-heading"
            className="mt-10"
          >
            <h2
              id="long-description-heading"
              className="mb-3 text-xl font-medium text-gray-900"
            >
              この機種について
            </h2>
            <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-gray-700">
              {earphone.long_description
                .trim()
                .split(/(?<=。)/)
                .map((part) => part.trim())
                .filter(Boolean)
                .map((sentence, index) => (
                  <p key={index}>{sentence}</p>
                ))}
            </div>
          </section>
        ) : null}

        {showAffiliate ? (
          <AffiliateActions
            product={earphone}
            placement="detail_bottom"
            className="mt-10"
          />
        ) : null}

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
