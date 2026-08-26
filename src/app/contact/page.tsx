import type { Metadata } from "next";
import Link from "next/link";

import { createPageMetadata } from "@/lib/site-metadata";

import { ContactForm } from "./ContactForm";

export const metadata: Metadata = createPageMetadata({
  title: "お問い合わせ",
  description: "Earphone Compareへのお問い合わせ",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-gray-600 transition-colors hover:text-teal-700"
        >
          ← 一覧に戻る
        </Link>

        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-gray-900">
          お問い合わせ
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-gray-600">
          ご質問・ご意見などがございましたら、以下のフォームよりお問い合わせください。
        </p>

        <ContactForm />
      </main>
    </div>
  );
}
