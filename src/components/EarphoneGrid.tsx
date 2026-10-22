import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { AffiliateActions } from "@/components/AffiliateActions";
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

const cardInteractiveClassName =
  "group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md";

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
            <article
              className={`${cardInteractiveClassName}${compare ? " cursor-pointer" : ""}`}
            >
              <Link
                href={detailHref}
                className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                aria-label={`${earphone.name}の詳細を見る`}
              />

              {compare ? (
                <div
                  className="relative z-10 border-b border-gray-100 bg-gray-50/60 px-4 py-3"
                  onClick={stopCardNavigation}
                >
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => compare.onToggle(earphone)}
                      onClick={stopCardNavigation}
                      className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="font-medium">
                      {isSelected ? "比較から外す" : "比較に追加"}
                    </span>
                  </label>
                </div>
              ) : null}

              <div className="pointer-events-none relative">
                <RemoteImage
                  src={earphone.image_url}
                  alt={`${earphone.name} 商品画像`}
                  className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  width={400}
                  height={192}
                  placeholderClassName="aspect-[5/3] h-48 w-full"
                />
                <div className="p-4">
                  <h2 className="mb-2 text-lg font-medium tracking-tight text-gray-900 transition-colors group-hover:text-teal-800">
                    {earphone.name}
                  </h2>
                  {renderSpecs(earphone, showBrand)}
                  {renderDescription(earphone)}
                  {renderDetailCue()}
                  {renderPurchase(earphone)}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/** カード全体リンクへのクリック伝播を止め、比較チェックと購入ボタンだけを操作する */
function stopCardNavigation(event: MouseEvent) {
  event.stopPropagation();
}

function renderPurchase(earphone: Earphone): ReactNode {
  return (
    <div
      className="pointer-events-auto relative z-10 mt-4"
      onClick={stopCardNavigation}
    >
      <AffiliateActions
        product={earphone}
        placement="card"
        density="compact"
      />
    </div>
  );
}

function renderDetailCue(): ReactNode {
  return (
    <span className="mt-4 inline-flex items-center gap-0.5 text-sm font-medium text-teal-700 transition-colors group-hover:text-teal-800">
      詳細を見る
      <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </span>
  );
}

function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
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
