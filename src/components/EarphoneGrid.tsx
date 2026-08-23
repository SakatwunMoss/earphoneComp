import { Card } from "@/components/Card";
import { earphonePagePath } from "@/lib/brand-url";
import { formatPrice } from "@/lib/format";
import type { Earphone } from "@/types/database";

type EarphoneGridProps = {
  earphones: Earphone[];
  showBrand?: boolean;
};

export function EarphoneGrid({
  earphones,
  showBrand = false,
}: EarphoneGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {earphones.map((earphone) => (
        <li key={earphone.id}>
          <Card href={earphonePagePath(earphone.brand, earphone.id)}>
            <h2 className="mb-2 text-lg font-medium tracking-tight text-gray-900">
              {earphone.name}
            </h2>
            <dl className="space-y-1 text-sm text-gray-600">
              {showBrand ? (
                <div className="flex gap-2">
                  <dt className="font-medium text-gray-500">ブランド</dt>
                  <dd>{earphone.brand}</dd>
                </div>
              ) : null}
              <div className="flex gap-2">
                <dt className="font-medium text-gray-500">価格</dt>
                <dd className="font-medium tracking-tight">
                  {formatPrice(earphone.price)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium text-gray-500">カテゴリ</dt>
                <dd>{earphone.category}</dd>
              </div>
            </dl>
            {earphone.description?.trim() ? (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-500">
                {earphone.description}
              </p>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}
