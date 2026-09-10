import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CompareTable } from "@/components/CompareTable";
import {
  brandComparePagePath,
  brandFromUrlParam,
  brandPagePath,
} from "@/lib/brand-url";
import {
  getEarphonesByIds,
  getStaticBrandParams,
} from "@/lib/earphones-data";
import { createPageMetadata } from "@/lib/site-metadata";

type PageProps = {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ ids?: string | string[] }>;
};

const MAX_COMPARE = 3;

function parseCompareIds(raw: string | string[] | undefined): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const ids = value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return [...new Set(ids)];
}

export function generateStaticParams() {
  return getStaticBrandParams();
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { brand: brandParam } = await params;
  const brand = brandFromUrlParam(brandParam);
  const ids = parseCompareIds((await searchParams).ids);

  return createPageMetadata({
    title: `${brand}のイヤホン比較`,
    description: `${brand}ブランドのイヤホンをスペック比較。価格・NC・バッテリーなどを横並びで確認できます。`,
    path: brandComparePagePath(brand, ids),
  });
}

export default async function BrandComparePage({
  params,
  searchParams,
}: PageProps) {
  const { brand: brandParam } = await params;
  const brand = brandFromUrlParam(brandParam);
  const ids = parseCompareIds((await searchParams).ids);

  if (ids.length === 0 || ids.length > MAX_COMPARE) {
    notFound();
  }

  const earphones = getEarphonesByIds(ids).filter(
    (earphone) => earphone.brand === brand,
  );

  if (earphones.length === 0 || earphones.length !== ids.length) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: brand, href: brandPagePath(brand) },
            { label: "比較", href: brandComparePagePath(brand, ids) },
          ]}
        />

        <header className="mb-8">
          <p className="mb-3">
            <Link
              href={brandPagePath(brand)}
              className="text-sm font-medium text-teal-600 transition-colors hover:text-teal-700"
            >
              ← 一覧に戻る
            </Link>
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {brand}の比較
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {earphones.length} 機種を比較中
          </p>
        </header>

        <CompareTable brand={brand} earphones={earphones} />

        <p className="mt-6 text-xs text-gray-400">
          ※表示価格は変動する場合があります。購入の際は各販売元の最新価格をご確認ください。
        </p>
      </main>
    </div>
  );
}
