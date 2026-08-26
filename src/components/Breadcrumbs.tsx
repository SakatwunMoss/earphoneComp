import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { buildBreadcrumbListJsonLd } from "@/lib/json-ld";

export type BreadcrumbItem = {
  label: string;
  /** JSON-LD 用。最終項目でも付与推奨（UI では最終項目はリンクにしない） */
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const breadcrumbJsonLd = buildBreadcrumbListJsonLd(items);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <nav aria-label="パンくずリスト" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-600">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={item.label} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-gray-400">
                    /
                  </span>
                ) : null}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-teal-700"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className="font-medium text-gray-900"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
