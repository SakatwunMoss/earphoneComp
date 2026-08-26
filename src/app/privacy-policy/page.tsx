import Link from "next/link";
import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "プライバシーポリシー",
  description: "Earphone Compareのプライバシーポリシー",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-gray-600 transition-colors hover:text-teal-700"
        >
          ← 一覧に戻る
        </Link>

        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-gray-900">
          プライバシーポリシー
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="mb-3 text-lg font-medium text-gray-900">
              サイトについて
            </h2>
            <p>
              当サイト「Earphone
              Compare」は、イヤホンの比較情報を提供する個人運営のウェブサイトです。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium text-gray-900">
              広告について
            </h2>
            <p className="mb-3">
              当サイトでは、Googleアドセンスを含む第三者配信の広告サービスを利用する可能性があります。これらの広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookieを使用する場合があります。
            </p>
            <p className="mb-3">
              広告配信事業者が使用するCookieには、個人を特定する情報は含まれません。ユーザーは、ブラウザの設定によりCookieを無効にすることができます。
            </p>
            <p>
              Cookieを無効にした場合、一部のサービスが正しく動作しないことがあります。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium text-gray-900">
              掲載情報について
            </h2>
            <p>
              当サイトに掲載している商品名・価格・画像等の情報は変更される場合があり、その正確性を保証するものではありません。商品の購入を検討される際は、必ず各販売元の最新情報をご確認ください。
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium text-gray-900">
              プライバシーポリシーの変更
            </h2>
            <p>
              本ポリシーの内容は、予告なく変更される場合があります。変更後のプライバシーポリシーは、当サイトに掲載した時点から効力を生じるものとします。
            </p>
          </section>

          <p className="pt-4 text-gray-500">制定日: 2026年8月23日</p>
        </div>
      </main>
    </div>
  );
}
