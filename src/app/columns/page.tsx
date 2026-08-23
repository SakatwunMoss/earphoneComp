import Link from "next/link";
import type { Metadata } from "next";

import { Card } from "@/components/Card";
import { columns, formatColumnDate } from "@/lib/columns";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "コラム",
  description: "イヤホン選びに役立つコラム記事一覧",
  path: "/columns",
});

export default function ColumnsPage() {
  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-gray-600 transition-colors hover:text-teal-700"
        >
          ← 一覧に戻る
        </Link>

        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-gray-900">
          コラム
        </h1>
        <p className="mb-8 text-sm text-gray-600">
          イヤホン選びに役立つ記事をまとめています。
        </p>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((column) => (
            <li key={column.slug} className="flex">
              <Card
                href={`/columns/${column.slug}`}
                className="flex h-full w-full flex-col"
              >
                <time
                  dateTime={column.publishedAt}
                  className="mb-2 text-xs font-medium text-teal-700"
                >
                  {formatColumnDate(column.publishedAt)}
                </time>
                <h2 className="mb-2 text-lg font-medium tracking-tight text-gray-900">
                  {column.title}
                </h2>
                <p className="text-sm leading-relaxed text-gray-600">
                  {column.description}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
