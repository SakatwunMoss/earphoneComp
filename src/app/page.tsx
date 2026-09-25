import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  BilingualButtonLabel,
  BilingualText,
} from "@/components/BilingualText";
import { BrandLogo } from "@/components/BrandLogo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/Card";
import { brandPagePath } from "@/lib/brand-url";
import { diagnoseCopy } from "@/lib/diagnose/copy";
import { getBrandSummaries } from "@/lib/earphones-data";
import { SITE_URL } from "@/lib/site-metadata";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

const { home: homeCopy } = diagnoseCopy;

export default function Home() {
  const brands = getBrandSummaries();

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full overflow-hidden">
        <Image
          src="/images/hero.jpg"
          alt="Earphone Compare — Find earphones by brand"
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
            <span className="block">Find earphones by brand</span>
            <span className="mt-1 block text-base font-medium text-gray-600 sm:text-lg">
              メーカーからイヤホンを探そう
            </span>
          </h1>
          <BilingualText
            as="p"
            copy={homeCopy.heroSupport}
            size="sm"
            className="max-w-xl"
            enClassName="text-gray-600 sm:text-base"
            jaClassName="!text-gray-500"
          />
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch">
            <Link
              href="/diagnose"
              className="inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-xl bg-teal-600 px-6 py-2.5 text-white transition-colors hover:bg-teal-700 sm:w-auto"
            >
              <BilingualButtonLabel inverted copy={homeCopy.startQuiz} />
            </Link>
            <a
              href="#brands"
              className="inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-xl border border-teal-200 bg-white/80 px-6 py-2.5 text-teal-800 transition-colors hover:border-teal-300 hover:bg-white sm:w-auto"
            >
              <BilingualButtonLabel copy={homeCopy.browseBrands} />
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
            <BilingualText
              copy={homeCopy.promoEyebrow}
              size="xs"
              enClassName="font-medium tracking-wide text-teal-700"
              jaClassName="!text-teal-700/75"
            />
            <BilingualText
              as="h2"
              id="diagnose-promo-heading"
              copy={homeCopy.promoTitle}
              size="2xl"
              className="mt-2"
              enClassName="text-gray-900"
              jaClassName="!text-gray-600"
            />
            <BilingualText
              as="p"
              copy={homeCopy.promoBody}
              size="sm"
              className="mt-3 max-w-2xl"
              enClassName="text-gray-600 sm:text-base"
              jaClassName="!text-gray-500"
            />
            <Link
              href="/diagnose"
              className="mt-6 inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-xl bg-teal-600 px-6 py-2.5 text-white transition-colors hover:bg-teal-700 sm:w-auto"
            >
              <BilingualButtonLabel inverted copy={homeCopy.promoCta} />
            </Link>
          </div>
        </div>
      </section>

      <div className="px-6 py-10">
        <main id="brands" className="mx-auto w-full max-w-6xl scroll-mt-24">
          <Breadcrumbs items={[{ label: "ホーム", href: "/" }]} />

          <BilingualText
            as="h2"
            copy={homeCopy.brandsHeading}
            size="xl"
            className="mb-6"
            enClassName="text-gray-900"
            jaClassName="!text-gray-600"
          />

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
                      <span className="text-gray-500"> models / 機種</span>
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
              No data / データがありません
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
