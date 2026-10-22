import Link from "next/link";

import { AffiliateActions } from "@/components/AffiliateActions";
import { RemoteImage } from "@/components/RemoteImage";
import { earphonePagePath } from "@/lib/brand-url";
import { formatPrice } from "@/lib/format";
import type { Earphone } from "@/types/database";

type ColumnRelatedProductsProps = {
  earphones: Earphone[];
};

const cardClassName =
  "group relative block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md";

export function ColumnRelatedProducts({
  earphones,
}: ColumnRelatedProductsProps) {
  if (earphones.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="related-products-heading"
      className="mt-12 border-t border-gray-200 pt-10"
    >
      <h2
        id="related-products-heading"
        className="mb-4 text-lg font-medium text-gray-900"
      >
        この記事で紹介した製品
      </h2>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {earphones.map((earphone) => (
          <li key={earphone.id}>
            <article className={cardClassName}>
              <Link
                href={earphonePagePath(earphone.brand, earphone.id)}
                className="absolute inset-0 z-0 rounded-xl"
                aria-label={`${earphone.name}の詳細を見る`}
              />
              <div className="pointer-events-none">
                <RemoteImage
                  src={earphone.image_url}
                  alt={`${earphone.name} 商品画像`}
                  className="h-40 w-full object-cover"
                  width={400}
                  height={160}
                  placeholderClassName="aspect-[5/2] h-40 w-full"
                />
                <div className="p-4">
                  <p className="mb-1 text-xs font-medium text-teal-700">
                    {earphone.brand}
                  </p>
                  <h3 className="mb-2 text-base font-medium tracking-tight text-gray-900">
                    {earphone.name}
                  </h3>
                  <p className="text-sm font-medium text-gray-700">
                    {formatPrice(earphone.price)}
                  </p>
                  <div className="pointer-events-auto relative z-10 mt-3">
                    <AffiliateActions
                      product={earphone}
                      placement="article"
                      density="compact"
                    />
                  </div>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
