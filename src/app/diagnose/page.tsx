import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DiagnoseQuiz } from "@/components/diagnose/DiagnoseQuiz";
import { diagnoseCopy } from "@/lib/diagnose/copy";
import { getAllEarphones } from "@/lib/earphones-data";
import { createPageMetadata } from "@/lib/site-metadata";

const { meta } = diagnoseCopy;

export const metadata: Metadata = createPageMetadata({
  title: `${meta.title.en} / ${meta.title.ja}`,
  description: `${meta.description.en} ${meta.description.ja}`,
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
            {
              label: `${meta.breadcrumb.en} / ${meta.breadcrumb.ja}`,
              href: "/diagnose",
            },
          ]}
        />
        <DiagnoseQuiz earphones={earphones} />
      </main>
    </div>
  );
}
