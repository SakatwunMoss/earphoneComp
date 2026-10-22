import { AffiliateButton } from "@/components/AffiliateButton";
import {
  formatAffiliatePriceLine,
  normalizeExternalUrl,
  type AffiliateDensity,
  type AffiliatePlacement,
  type AffiliateProduct,
  type AffiliateProvider,
} from "@/lib/affiliate-display";
import { shopLabelFromUrl } from "@/lib/shop-label";

type ShopLink = {
  provider: AffiliateProvider;
  href: string;
  priceLabel: string | null;
};

type AffiliateActionsProps = {
  product: AffiliateProduct;
  placement: AffiliatePlacement;
  /** default: 詳細向けの縦積み。compact: カード向けの横並び。 */
  density?: AffiliateDensity;
  className?: string;
};

function shopLinks(product: AffiliateProduct): ShopLink[] {
  const links: ShopLink[] = [];

  const rakutenUrl = normalizeExternalUrl(product.rakuten_url);
  if (rakutenUrl) {
    links.push({
      provider: "rakuten",
      href: rakutenUrl,
      priceLabel: formatAffiliatePriceLine(
        product.rakuten_price,
        product.rakuten_updated_at,
      ),
    });
  }

  const yahooUrl = normalizeExternalUrl(product.yahoo_url);
  if (yahooUrl) {
    links.push({
      provider: "yahoo",
      href: yahooUrl,
      priceLabel: formatAffiliatePriceLine(
        product.yahoo_price,
        product.yahoo_updated_at,
      ),
    });
  }

  return links;
}

export function AffiliateActions({
  product,
  placement,
  density = "default",
  className = "",
}: AffiliateActionsProps) {
  const shops = shopLinks(product);
  const officialUrl = normalizeExternalUrl(product.url);
  const compact = density === "compact";

  if (shops.length === 0 && !officialUrl) {
    return null;
  }

  const shopLayout = compact
    ? shops.length > 1
      ? "grid grid-cols-2 gap-2"
      : "grid grid-cols-1 gap-2"
    : "flex w-full max-w-md flex-col gap-4";

  return (
    <div className={className}>
      {shops.length > 0 ? (
        <div className={shopLayout}>
          {shops.map((shop) => (
            <AffiliateButton
              key={shop.provider}
              href={shop.href}
              provider={shop.provider}
              productId={product.id}
              productName={product.name}
              placement={placement}
              density={density}
              priceLabel={shop.priceLabel}
            />
          ))}
        </div>
      ) : null}
      {officialUrl ? (
        <p className={shops.length > 0 ? "mt-2" : ""}>
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 underline decoration-gray-300 underline-offset-2 transition-colors hover:text-gray-700"
          >
            {shopLabelFromUrl(officialUrl)}のページ
            <span className="sr-only">（新しいタブで開きます）</span>
          </a>
        </p>
      ) : null}
    </div>
  );
}
