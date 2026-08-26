import { brandPagePath, earphonePagePath } from "@/lib/brand-url";
import { SITE_URL } from "@/lib/site-metadata";
import type { Earphone } from "@/types/database";

export type JsonLd = Record<string, unknown>;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

type BreadcrumbLdItem = {
  label: string;
  href?: string;
};

/** BreadcrumbList（ホーム > ブランド > 機種名） */
export function buildBreadcrumbListJsonLd(items: BreadcrumbLdItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const listItem: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
      };
      if (item.href) {
        listItem.item = absoluteUrl(item.href);
      }
      return listItem;
    }),
  };
}

type OfferInput = {
  price: number | null;
  url: string;
};

function buildOffer(offer: OfferInput): JsonLd | null {
  if (offer.price == null) {
    return null;
  }

  return {
    "@type": "Offer",
    price: offer.price,
    priceCurrency: "JPY",
    url: offer.url,
  };
}

/** Product（詳細ページ） */
export function buildProductJsonLd(earphone: Earphone): JsonLd {
  const productPageUrl = absoluteUrl(
    earphonePagePath(earphone.brand, earphone.id),
  );

  const offers: JsonLd[] = [];

  const primaryOffer = buildOffer({
    price: earphone.price,
    url: earphone.url?.trim() || productPageUrl,
  });
  if (primaryOffer) {
    offers.push(primaryOffer);
  }

  if (earphone.rakuten_url?.trim()) {
    const rakutenOffer = buildOffer({
      price: earphone.rakuten_price,
      url: earphone.rakuten_url.trim(),
    });
    if (rakutenOffer) {
      offers.push(rakutenOffer);
    } else {
      // 価格未取得でも楽天 URL がある場合は候補として URL のみ含める
      offers.push({
        "@type": "Offer",
        priceCurrency: "JPY",
        url: earphone.rakuten_url.trim(),
      });
    }
  }

  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: earphone.name,
    brand: {
      "@type": "Brand",
      name: earphone.brand,
    },
  };

  if (earphone.image_url?.trim()) {
    jsonLd.image = earphone.image_url.trim();
  }

  if (earphone.description?.trim()) {
    jsonLd.description = earphone.description.trim();
  }

  if (offers.length === 1) {
    jsonLd.offers = offers[0];
  } else if (offers.length > 1) {
    jsonLd.offers = offers;
  }

  return jsonLd;
}

/** ItemList（ブランド別一覧） */
export function buildItemListJsonLd(
  brand: string,
  earphones: Pick<Earphone, "id" | "name" | "brand">[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${brand}のイヤホン一覧`,
    url: absoluteUrl(brandPagePath(brand)),
    numberOfItems: earphones.length,
    itemListElement: earphones.map((earphone, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: earphone.name,
      url: absoluteUrl(earphonePagePath(earphone.brand, earphone.id)),
    })),
  };
}
