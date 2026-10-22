import { formatPrice } from "@/lib/format";
import type { Earphone } from "@/types/database";

export type AffiliateProvider = "rakuten" | "yahoo";

export type AffiliatePlacement =
  | "card"
  | "detail_top"
  | "detail_bottom"
  | "table"
  | "article";

/** default は詳細ページの縦積み。compact は一覧カードの横並び。 */
export type AffiliateDensity = "default" | "compact";

export type AffiliateProduct = Pick<
  Earphone,
  | "id"
  | "name"
  | "url"
  | "rakuten_url"
  | "rakuten_price"
  | "rakuten_updated_at"
  | "yahoo_url"
  | "yahoo_price"
  | "yahoo_updated_at"
>;

export function normalizeExternalUrl(
  url: string | null | undefined,
): string | null {
  const trimmed = url?.trim();
  return trimmed ? trimmed : null;
}

export function hasAffiliateLink(
  product: Pick<AffiliateProduct, "rakuten_url" | "yahoo_url">,
): boolean {
  return (
    normalizeExternalUrl(product.rakuten_url) != null ||
    normalizeExternalUrl(product.yahoo_url) != null
  );
}

/**
 * 取得日を日本時間の「M月D日時点」にする。
 * 日付が古くても、解釈できる値はそのまま出す。
 */
export function formatAsOfLabel(iso: string | null | undefined): string | null {
  const trimmed = iso?.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!month || !day) return null;

  return `${month}月${day}日時点`;
}

/** 価格が無いときは null。日付が無いときは金額だけを返す。 */
export function formatAffiliatePriceLine(
  price: number | null,
  updatedAt: string | null | undefined,
): string | null {
  if (price == null) return null;

  const amount = formatPrice(price);
  const asOf = formatAsOfLabel(updatedAt);
  return asOf ? `${amount}（${asOf}）` : amount;
}
