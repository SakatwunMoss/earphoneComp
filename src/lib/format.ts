export function formatPrice(price: number | null): string {
  if (price == null) {
    return "—";
  }
  return `¥${price.toLocaleString("ja-JP")}`;
}

export function formatBoolean(value: boolean): string {
  return value ? "対応" : "非対応";
}
