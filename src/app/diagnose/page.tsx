import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DiagnoseQuiz } from "@/components/diagnose/DiagnoseQuiz";
import { getAllEarphones } from "@/lib/earphones-data";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "好み診断",
  description:
    "使用シーンや予算などの質問に答えて、相性のよいイヤホンを提案します。結果からそのまま比較もできます。",
  path: "/diagnose",
});

export default function DiagnosePage() {
  const earphones = getAllEarphones();

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "好み診断", href: "/diagnose" },
          ]}
        />
        <DiagnoseQuiz earphones={earphones} />
      </main>
    </div>
  );
}
