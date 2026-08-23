import { Card } from "@/components/Card";
import { RemoteImage } from "@/components/RemoteImage";
import { earphonePagePath } from "@/lib/brand-url";
import { formatPrice } from "@/lib/format";
import type { Earphone } from "@/types/database";

type ColumnRelatedProductsProps = {
  earphones: Earphone[];
};

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
            <Card
              href={earphonePagePath(earphone.brand, earphone.id)}
              className="overflow-hidden p-0"
            >
              <RemoteImage
                src={earphone.image_url}
                alt={earphone.name}
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
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
