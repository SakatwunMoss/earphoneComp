"use client";

import type {
  AffiliateDensity,
  AffiliatePlacement,
  AffiliateProvider,
} from "@/lib/affiliate-display";
import { trackAffiliateClick } from "@/lib/track-affiliate-click";

const LABEL: Record<AffiliateProvider, string> = {
  rakuten: "楽天で価格を見る",
  yahoo: "Yahoo!ショッピングで価格を見る",
};

const COLOR_CLASS: Record<AffiliateProvider, string> = {
  rakuten: "bg-[#BF0000] hover:bg-[#9f0000]",
  yahoo: "bg-[#FF0033] hover:bg-[#d4002b]",
};

type AffiliateButtonProps = {
  href: string;
  provider: AffiliateProvider;
  productId: string;
  productName: string;
  placement: AffiliatePlacement;
  density?: AffiliateDensity;
  priceLabel?: string | null;
};

export function AffiliateButton({
  href,
  provider,
  productId,
  productName,
  placement,
  density = "default",
  priceLabel,
}: AffiliateButtonProps) {
  const compact = density === "compact";

  return (
    <div className="min-w-0">
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        onClick={() =>
          trackAffiliateClick({
            provider,
            productId,
            productName,
            placement,
          })
        }
        className={`inline-flex w-full items-center justify-center rounded-lg text-center font-medium text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${COLOR_CLASS[provider]} ${
          compact
            ? "min-h-10 px-1.5 py-1 text-[11px] leading-tight"
            : "min-h-12 px-4 py-2 text-base leading-tight"
        }`}
      >
        {LABEL[provider]}
        <span className="sr-only">（新しいタブで開きます）</span>
      </a>
      {priceLabel ? (
        <p
          className={`mt-1 text-gray-600 ${
            compact ? "text-center text-[11px] leading-snug" : "text-sm"
          }`}
        >
          {priceLabel}
        </p>
      ) : null}
    </div>
  );
}
