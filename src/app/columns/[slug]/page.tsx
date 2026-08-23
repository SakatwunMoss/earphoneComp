export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ColumnBody } from "@/components/ColumnBody";
import { ColumnRelatedProducts } from "@/components/ColumnRelatedProducts";
import {
  columns,
  formatColumnDate,
  getColumnBySlug,
} from "@/lib/columns";
import { getRelatedEarphones } from "@/lib/column-related-products";
import { createPageMetadata } from "@/lib/site-metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return columns.map((column) => ({ slug: column.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const column = getColumnBySlug(slug);

  if (!column) {
    return { title: "記事が見つかりません" };
  }

  return createPageMetadata({
    title: column.title,
    description: column.description,
    path: `/columns/${column.slug}`,
  });
}

export default async function ColumnDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const column = getColumnBySlug(slug);

  if (!column) {
    notFound();
  }

  const relatedEarphones = column.relatedProducts
    ? await getRelatedEarphones(column.relatedProducts)
    : [];

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-3xl">
        <Link
          href="/columns"
          className="mb-6 inline-block text-sm text-gray-600 transition-colors hover:text-teal-700"
        >
          ← コラム一覧に戻る
        </Link>

        <time
          dateTime={column.publishedAt}
          className="mb-3 block text-sm font-medium text-teal-700"
        >
          {formatColumnDate(column.publishedAt)}
        </time>

        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-gray-900">
          {column.title}
        </h1>

        <ColumnBody body={column.body} />

        <ColumnRelatedProducts earphones={relatedEarphones} />
      </main>
    </div>
  );
}
