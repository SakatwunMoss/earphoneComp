import type {
  AffiliatePlacement,
  AffiliateProvider,
} from "@/lib/affiliate-display";

type TrackAffiliateClickInput = {
  provider: AffiliateProvider;
  productId: string;
  productName: string;
  placement: AffiliatePlacement;
};

/** クリック時だけ実行する。gtag が無いとき、SSR では何もしない。 */
export function trackAffiliateClick(input: TrackAffiliateClickInput): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const pagePath = `${window.location.pathname}${window.location.search}`;

  window.gtag("event", "affiliate_click", {
    provider: input.provider,
    product_id: input.productId,
    product_name: input.productName,
    placement: input.placement,
    page_path: pagePath,
  });
}
