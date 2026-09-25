import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/Card";
import { brandPagePath } from "@/lib/brand-url";
import { getBrandSummaries } from "@/lib/earphones-data";
import { SITE_URL } from "@/lib/site-metadata";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

export default function Home() {
  const brands = getBrandSummaries();

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full overflow-hidden">
        <Image
          src="/images/hero.jpg"
          alt="Earphone Compare — メーカーからイヤホンを探そう"
          width={1584}
          height={672}
          priority
          className="h-auto max-h-[min(52vh,420px)] w-full object-cover object-center sm:max-h-[min(48vh,480px)]"
        />
      </div>

      <section
        aria-labelledby="hero-heading"
        className="w-full border-b border-teal-100 bg-teal-50"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-6 py-12 sm:py-16">
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
            ブランド一覧から探すか、好み診断で相性のよい機種を見つけられます。
          </p>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/diagnose"
              className="inline-flex w-full items-center justify-center rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 sm:w-auto"
            >
              好み診断を始める
            </Link>
            <a
              href="#brands"
              className="inline-flex w-full items-center justify-center rounded-xl border border-teal-200 bg-white/80 px-6 py-3 text-sm font-medium text-teal-800 transition-colors hover:border-teal-300 hover:bg-white sm:w-auto"
            >
              メーカーから探す
            </a>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="diagnose-promo-heading"
        className="w-full border-b border-teal-100 bg-white"
      >
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-8 sm:px-8 sm:py-10">
            <p className="text-xs font-medium tracking-wide text-teal-700">
              好み診断
            </p>
            <h2
              id="diagnose-promo-heading"
              className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl"
            >
              1分で、あなたに合うイヤホンが見つかる
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
              使用シーンや予算など、いくつかの質問に答えるだけでおすすめを提案します。結果からそのまま比較もできます。
            </p>
            <Link
              href="/diagnose"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-teal-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700 sm:w-auto"
            >
              診断をはじめる
            </Link>
          </div>
        </div>
      </section>

      <div className="px-6 py-10">
        <main id="brands" className="mx-auto w-full max-w-6xl scroll-mt-24">
          <Breadcrumbs items={[{ label: "ホーム", href: "/" }]} />

          <h2 className="mb-6 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            メーカーから探す
          </h2>

          {brands.length > 0 ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {brands.map(({ brand, count }) => (
                <li key={brand} className="flex">
                  <Card
                    href={brandPagePath(brand)}
                    className="flex h-full w-full flex-col"
                  >
                    <BrandLogo brand={brand} />
                    <h3 className="mb-2 text-lg font-medium tracking-tight text-gray-900">
                      {brand}
                    </h3>
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
