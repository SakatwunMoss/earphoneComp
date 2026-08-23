import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/Card";
import { RemoteImage } from "@/components/RemoteImage";
import { earphonePagePath } from "@/lib/brand-url";
import { formatPrice } from "@/lib/format";
import type { Earphone } from "@/types/database";

type CompareConfig = {
  selectedIds: string[];
  onToggle: (earphone: Earphone) => void;
};

type EarphoneGridProps = {
  earphones: Earphone[];
  showBrand?: boolean;
  compare?: CompareConfig;
};

export function EarphoneGrid({
  earphones,
  showBrand = false,
  compare,
}: EarphoneGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {earphones.map((earphone) => {
        const isSelected = compare?.selectedIds.includes(earphone.id) ?? false;
        const detailHref = earphonePagePath(earphone.brand, earphone.id);

        return (
          <li key={earphone.id}>
            {compare ? (
              <Card className="overflow-hidden p-0">
                <div className="border-b border-gray-100 bg-gray-50/60 px-4 py-3">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => compare.onToggle(earphone)}
                      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-medium">
                      {isSelected ? "比較から外す" : "比較に追加"}
                    </span>
                  </label>
                </div>
                <Link href={detailHref} className="block transition-opacity hover:opacity-95">
                  <RemoteImage
                    src={earphone.image_url}
                    alt={earphone.name}
                    className="h-48 w-full object-cover"
                    width={400}
                    height={192}
                    placeholderClassName="aspect-[5/3] h-48 w-full"
                  />
                </Link>
                <div className="p-4">
                  <h2 className="mb-2 text-lg font-medium tracking-tight text-gray-900">
                    <Link
                      href={detailHref}
                      className="transition-colors hover:text-teal-700"
                    >
                      {earphone.name}
                    </Link>
                  </h2>
                  {renderSpecs(earphone, showBrand)}
                  {renderDescription(earphone)}
                </div>
              </Card>
            ) : (
              <Card href={detailHref} className="overflow-hidden p-0">
                <RemoteImage
                  src={earphone.image_url}
                  alt={earphone.name}
                  className="h-48 w-full object-cover"
                  width={400}
                  height={192}
                  placeholderClassName="aspect-[5/3] h-48 w-full"
                />
                <div className="p-4">
                  <h2 className="mb-2 text-lg font-medium tracking-tight text-gray-900">
                    {earphone.name}
                  </h2>
                  {renderSpecs(earphone, showBrand)}
                  {renderDescription(earphone)}
                </div>
              </Card>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function renderSpecs(earphone: Earphone, showBrand: boolean): ReactNode {
  return (
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
  );
}

function renderDescription(earphone: Earphone): ReactNode {
  if (!earphone.description?.trim()) {
    return null;
  }

  return (
    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-500">
      {earphone.description}
    </p>
  );
}
