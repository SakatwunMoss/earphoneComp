/**
 * ブランド名 → ロゴ画像 URL の対応表（コード側で管理）。
 *
 * DB で persist したい場合は brands テーブルを新規作成し、
 * brand (text, PK), logo_url (text), website (text) 等を持たせ、
 * seed や管理画面から更新する運用が考えられます。
 */
export const BRAND_LOGO_URLS: Record<string, string> = {
  Apple:
    "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  Anker:
    "https://upload.wikimedia.org/wikipedia/commons/2/2a/Anker_logo.svg",
  "Audio-Technica":
    "https://upload.wikimedia.org/wikipedia/commons/4/47/Audio-technica.svg",
  Beats:
    "https://upload.wikimedia.org/wikipedia/commons/1/17/Beats_Electronics_logo.svg",
  Bose: "https://upload.wikimedia.org/wikipedia/commons/0/0a/Bose_logo.svg",
  Google:
    "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  JBL: "https://upload.wikimedia.org/wikipedia/commons/1/1a/JBL_logo.svg",
  JVC: "https://upload.wikimedia.org/wikipedia/commons/3/3e/JVC_logo.svg",
  Panasonic:
    "https://upload.wikimedia.org/wikipedia/commons/1/1e/Panasonic_logo_%28Blue%29.svg",
  Samsung:
    "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
  Sennheiser:
    "https://upload.wikimedia.org/wikipedia/commons/6/60/Sennheiser_logo_2018.svg",
  Shure:
    "https://upload.wikimedia.org/wikipedia/commons/4/4e/Shure_logo.svg",
  Sony: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg",
  "Ultimate Ears":
    "https://upload.wikimedia.org/wikipedia/commons/5/5a/Ultimate_Ears_logo.svg",
};

export function getBrandLogoUrl(brand: string): string | null {
  return BRAND_LOGO_URLS[brand] ?? null;
}
