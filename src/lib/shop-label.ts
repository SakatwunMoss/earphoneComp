/** hostname（www. なし）→ 表示用ショップ名 */
const SHOP_LABELS: Record<string, string> = {
  "amazon.co.jp": "Amazon",
  "amazon.com": "Amazon",
  "ankerjapan.com": "Anker",
  "apple.com": "Apple",
  "beatsbydre.com": "Beats",
  "bose.co.jp": "Bose",
  "e-earphone.jp": "e☆イヤホン",
  "jabra.com": "Jabra",
  "kakaku.com": "価格.com",
  "phileweb.com": "Phile-web",
  "philips.co.jp": "Philips",
  "rakuten.co.jp": "楽天市場",
  "item.rakuten.co.jp": "楽天市場",
  "shure.com": "Shure",
  "sony.jp": "Sony",
  "soundhouse.co.jp": "サウンドハウス",
  "yamada-denkiweb.com": "ヤマダデンキ",
};

/**
 * 購入先 URL からボタン用のショップ名を返す。
 * 未知のドメインは hostname の先頭ラベルをそのまま使う。
 */
export function shopLabelFromUrl(url: string | null | undefined): string {
  if (!url) return "ショップ";

  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();

    if (SHOP_LABELS[hostname]) {
      return SHOP_LABELS[hostname];
    }

    for (const [host, label] of Object.entries(SHOP_LABELS)) {
      if (hostname === host || hostname.endsWith(`.${host}`)) {
        return label;
      }
    }

    const firstLabel = hostname.split(".")[0];
    if (firstLabel) {
      return firstLabel.charAt(0).toUpperCase() + firstLabel.slice(1);
    }
  } catch {
    // ignore invalid URL
  }

  return "ショップ";
}
