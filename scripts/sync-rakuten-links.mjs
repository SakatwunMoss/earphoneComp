// earphonesテーブルの各機種を楽天市場で検索し、見つかった商品のアフィリエイトリンクを
// rakuten_url / rakuten_price / rakuten_updated_at に保存するバッチスクリプト。
// url / price 列（公式または現状掲載中ショップ）には一切書き込まない。
//
// 実行方法:
//   node scripts/sync-rakuten-links.mjs
//   DRY_RUN=true node scripts/sync-rakuten-links.mjs
//
// 環境変数:
//   SUPABASE_URL               Supabaseプロジェクトの URL
//                              （未設定時は NEXT_PUBLIC_SUPABASE_URL を利用）
//   SUPABASE_SERVICE_ROLE_KEY  RLSをバイパスして書き込むためのService Role Key
//   RAKUTEN_APP_ID             楽天ウェブサービスのアプリID（UUID形式）
//   RAKUTEN_ACCESS_KEY         楽天ウェブサービスのアクセスキー
//   RAKUTEN_AFFILIATE_ID       楽天アフィリエイトID
//   RAKUTEN_ORIGIN             （任意）アプリ登録時の許可ドメイン。Web application 登録時は
//                              Origin/Referer ヘッダーとして送信する（例: https://example.com）
//                              Backend service 登録なら不要
//   DRY_RUN                    "true"を指定すると実際の更新はせず、結果だけログ出力する

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID?.trim();
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY?.trim();
const RAKUTEN_AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID?.trim();
const RAKUTEN_ORIGIN = process.env.RAKUTEN_ORIGIN?.trim();
const DRY_RUN = process.env.DRY_RUN === "true";

const REQUIRED_ENV = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  RAKUTEN_APP_ID,
  RAKUTEN_ACCESS_KEY,
  RAKUTEN_AFFILIATE_ID,
};
for (const [key, value] of Object.entries(REQUIRED_ENV)) {
  if (!value) {
    console.error(`環境変数 ${key} が設定されていません`);
    if (key === "SUPABASE_URL") {
      console.error(
        "  → SUPABASE_URL または NEXT_PUBLIC_SUPABASE_URL を設定してください",
      );
    }
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 楽天市場API 2026-07-01（旧 app.rakuten.co.jp は廃止）
const RAKUTEN_ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
// 楽天APIは1秒あたり1リクエストが目安のレート制限。余裕を持たせておく。
const REQUEST_INTERVAL_MS = 1100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 型番・機種名を比較しやすいよう正規化(空白・記号除去、全角/半角統一、小文字化)
function normalize(str) {
  return str
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_()（）/／,、]/g, "");
}

// 楽天APIはキーワードを空白区切りにし、各トークンは半角2文字以上が必要。
// 「AirPods 4」「Liberty 5」のような単独数字を前の語に結合する。
function buildSearchKeyword(brand, name) {
  return `${brand} ${name}`
    .replace(/\s+(\d)\b/g, "$1")
    .replace(/\s+\+/g, "+")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchRakuten(keyword) {
  const url = new URL(RAKUTEN_ENDPOINT);
  url.searchParams.set("applicationId", RAKUTEN_APP_ID);
  url.searchParams.set("accessKey", RAKUTEN_ACCESS_KEY);
  url.searchParams.set("affiliateId", RAKUTEN_AFFILIATE_ID);
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("hits", "30");
  url.searchParams.set("sort", "-reviewCount");
  url.searchParams.set("formatVersion", "2");

  const headers = {};
  if (RAKUTEN_ORIGIN) {
    headers.Origin = RAKUTEN_ORIGIN;
    headers.Referer = `${RAKUTEN_ORIGIN}/`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Rakuten API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.Items ?? [];
}

// アクセサリー・周辺機器を除外するためのキーワード
const EXCLUDE_KEYWORDS = [
  "ケース",
  "カバー",
  "ポーチ",
  "イヤーピース",
  "イヤーチップ",
  "イヤーパッド",
  "フィルム",
  "保護",
  "スペア",
  "替え",
  "互換",
  "交換用",
  "ストラップ",
  "クリーニング",
];

// 機種名(型番)が商品名に含まれているものを候補とし、
// 価格レンジ・除外キーワードで足切りしたうえでレビュー件数が多い順に採用
function findBestMatch(earphone, items) {
  const normalizedModel = normalize(earphone.name);
  const currentPrice = earphone.price;

  const candidates = items.filter((item) => {
    const itemName = item.itemName ?? "";
    const normalizedItemName = normalize(itemName);

    if (!normalizedItemName.includes(normalizedModel)) return false;

    // 除外キーワード: イヤーピース・ケース等の周辺アクセサリーを落とす
    if (EXCLUDE_KEYWORDS.some((kw) => itemName.includes(kw))) return false;

    // 価格レンジ: 現在価格の 0.4〜2.5 倍外は本体以外の可能性が高い
    if (currentPrice != null && currentPrice > 0 && item.itemPrice != null) {
      const ratio = item.itemPrice / currentPrice;
      if (ratio < 0.4 || ratio > 2.5) return false;
    }

    return true;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  return candidates[0];
}

async function main() {
  if (DRY_RUN) {
    console.log("*** DRY_RUN モード: 実際のDB更新は行いません ***\n");
  }

  const { data: earphones, error } = await supabase
    .from("earphones")
    .select("id, name, brand, price, url, rakuten_url, rakuten_price");

  if (error) {
    console.error("Supabaseからのデータ取得に失敗:", error);
    process.exit(1);
  }

  console.log(`対象機種: ${earphones.length}件\n`);

  const summary = { updated: [], skipped: [], failed: [] };

  for (const earphone of earphones) {
    const keyword = buildSearchKeyword(earphone.brand, earphone.name);
    try {
      const items = await searchRakuten(keyword);
      const match = findBestMatch(earphone, items);

      if (!match) {
        summary.skipped.push({
          name: `${earphone.brand} ${earphone.name}`,
          reason: "一致する商品が見つかりませんでした",
        });
        await sleep(REQUEST_INTERVAL_MS);
        continue;
      }

      const rakutenUrl = match.affiliateUrl || match.itemUrl;
      const rakutenPrice = match.itemPrice ?? null;
      const rakutenUpdatedAt = new Date().toISOString();

      if (DRY_RUN) {
        summary.updated.push({
          name: `${earphone.brand} ${earphone.name}`,
          rakutenUrl,
          rakutenPrice,
          shopPrice: earphone.price,
          itemName: match.itemName,
        });
      } else {
        const { error: updateError } = await supabase
          .from("earphones")
          .update({
            rakuten_url: rakutenUrl,
            rakuten_price: rakutenPrice,
            rakuten_updated_at: rakutenUpdatedAt,
          })
          .eq("id", earphone.id);

        if (updateError) {
          summary.failed.push({
            name: `${earphone.brand} ${earphone.name}`,
            reason: updateError.message,
          });
        } else {
          summary.updated.push({
            name: `${earphone.brand} ${earphone.name}`,
            rakutenUrl,
            rakutenPrice,
            shopPrice: earphone.price,
          });
        }
      }
    } catch (err) {
      summary.failed.push({
        name: `${earphone.brand} ${earphone.name}`,
        reason: err.message,
      });
    }

    await sleep(REQUEST_INTERVAL_MS);
  }

  console.log("=== 更新結果 ===");
  console.log(
    `楽天リンク更新${DRY_RUN ? "対象" : ""}: ${summary.updated.length}件`,
  );
  console.log(`スキップ(未マッチ): ${summary.skipped.length}件`);
  console.log(`失敗: ${summary.failed.length}件`);

  if (summary.updated.length > 0) {
    console.log("\n--- 更新一覧 ---");
    summary.updated.forEach((s) => {
      const ratio =
        s.shopPrice != null && s.shopPrice > 0 && s.rakutenPrice != null
          ? (s.rakutenPrice / s.shopPrice).toFixed(2)
          : "?";
      const priceInfo =
        s.shopPrice != null
          ? `楽天¥${s.rakutenPrice} / ショップ¥${s.shopPrice} (${ratio}x)`
          : `楽天¥${s.rakutenPrice}`;
      console.log(`- ${s.name}: ${priceInfo}`);
      if (s.itemName) console.log(`    ${s.itemName}`);
      console.log(`    ${s.rakutenUrl}`);
    });
  }
  if (summary.skipped.length > 0) {
    console.log("\n--- スキップ一覧 ---");
    summary.skipped.forEach((s) => console.log(`- ${s.name}: ${s.reason}`));
  }
  if (summary.failed.length > 0) {
    console.log("\n--- 失敗一覧 ---");
    summary.failed.forEach((s) => console.log(`- ${s.name}: ${s.reason}`));
    process.exitCode = 1;
  }
}

main();
