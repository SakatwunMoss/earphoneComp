// earphonesテーブルの各機種をYahoo!ショッピングで検索し、見つかった商品のアフィリエイトリンクを
// yahoo_url / yahoo_price / yahoo_updated_at に保存するバッチスクリプト。
// url / price 列（公式または現状掲載中ショップ）には一切書き込まない。
//
// 実行方法:
//   node scripts/sync-yahoo-links.mjs
//   DRY_RUN=true node scripts/sync-yahoo-links.mjs
//   SYNC_LIMIT=3 node scripts/sync-yahoo-links.mjs   # 先頭N件のみ（動作確認用）
//
// 環境変数:
//   SUPABASE_URL               Supabaseプロジェクトの URL
//                              （未設定時は NEXT_PUBLIC_SUPABASE_URL を利用）
//   SUPABASE_SERVICE_ROLE_KEY  RLSをバイパスして書き込むためのService Role Key
//   YAHOO_APP_ID               Yahoo!デベロッパーネットワークの Client ID（appid）
//                              未設定時は YAHOO_CLIENT_ID を利用
//   VC_SID                     バリューコマース sid
//   VC_PID                     バリューコマース pid
//   DRY_RUN                    "true"を指定すると実際の更新はせず、結果だけログ出力する
//   SYNC_LIMIT                 （任意）処理する機種数の上限
//   DEBUG                      "true"を指定するとYahoo APIリクエスト/エラーの詳細を出力する

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
const YAHOO_APP_ID =
  process.env.YAHOO_APP_ID?.trim() || process.env.YAHOO_CLIENT_ID?.trim();
const VC_SID = process.env.VC_SID?.trim();
const VC_PID = process.env.VC_PID?.trim();
const DRY_RUN = process.env.DRY_RUN === "true";
const DEBUG = process.env.DEBUG === "true";
const SYNC_LIMIT = process.env.SYNC_LIMIT
  ? Number.parseInt(process.env.SYNC_LIMIT, 10)
  : null;

const REQUIRED_ENV = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  YAHOO_APP_ID,
  VC_SID,
  VC_PID,
};
for (const [key, value] of Object.entries(REQUIRED_ENV)) {
  if (!value) {
    console.error(`環境変数 ${key} が設定されていません`);
    if (key === "SUPABASE_URL") {
      console.error(
        "  → SUPABASE_URL または NEXT_PUBLIC_SUPABASE_URL を設定してください",
      );
    }
    if (key === "YAHOO_APP_ID") {
      console.error(
        "  → YAHOO_APP_ID または YAHOO_CLIENT_ID を設定してください",
      );
    }
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const YAHOO_ENDPOINT =
  "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";

// バリューコマース経由のアフィリエイトID（Yahoo API 仕様: UTF-8 URLエンコード文字列）
const VC_AFFILIATE_ID = encodeURIComponent(
  `http://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${VC_SID}&pid=${VC_PID}&vc_url=`,
);

// Yahoo!ショッピングAPIはレート制限があるため、リクエスト間隔を空ける
const REQUEST_INTERVAL_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(str) {
  return str
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_()（）/／,、]/g, "");
}

function buildSearchKeyword(brand, name) {
  return `${brand} ${name}`
    .replace(/\s+(\d)\b/g, "$1")
    .replace(/\s+\+/g, "+")
    .replace(/\s+/g, " ")
    .trim();
}

function maskSecret(value, visiblePrefix = 4) {
  if (!value) return "(未設定)";
  if (value.length <= visiblePrefix) return "***";
  return `${value.slice(0, visiblePrefix)}...(${value.length}文字)`;
}

function parseYahooErrorBody(bodyText) {
  try {
    return JSON.parse(bodyText);
  } catch {
    return null;
  }
}

function extractYahooErrorMessage(parsed, bodyText) {
  if (parsed == null) return null;
  const message =
    parsed.message ??
    parsed.Message ??
    parsed.error ??
    parsed.Error?.Message ??
    parsed.Error?.message;
  return message != null ? String(message) : null;
}

function diagnoseYahooApiError(status, bodyText, parsed) {
  const message = extractYahooErrorMessage(parsed, bodyText) ?? bodyText ?? "";
  const combined = `${message}\n${bodyText}`.toLowerCase();

  const credentialPatterns = [
    "credential",
    "valid app",
    "appid",
    "authentication",
    "unauthorized",
    "access denied",
    "invalid client",
    "please provide valid",
    "your request was forbidden",
    "request was forbidden",
  ];
  const affiliatePatterns = [
    "affiliate",
    "affiliate_id",
    "affiliate_type",
    "valuecommerce",
    "value commerce",
    "vc_sid",
    "vc_pid",
    "バリューコマース",
  ];

  if (status === 401 || credentialPatterns.some((p) => combined.includes(p))) {
    return {
      category: "credentials",
      summary:
        "Client ID（YAHOO_APP_ID）の認証・権限不足の可能性が高いです",
      hints: [
        "Yahoo!デベロッパーネットワークで「クライアントサイドアプリケーション」として登録した Client ID を使用しているか確認",
        "Shopping Web API（itemSearch）が利用可能なアプリか確認",
        "サーバーサイド登録の Client ID をクライアントサイド用に差し替えた場合、旧 ID が残っていないか .env.local / GitHub Secrets を確認",
      ],
    };
  }

  if (affiliatePatterns.some((p) => combined.includes(p))) {
    return {
      category: "affiliate",
      summary:
        "バリューコマース（VC_SID / VC_PID / affiliate_id）絡みの問題の可能性が高いです",
      hints: [
        "VC_SID / VC_PID がバリューコマース管理画面の値と一致しているか確認",
        "affiliate_type=vc と affiliate_id の形式が Yahoo API 仕様どおりか確認",
        "バリューコマース側で Yahoo!ショッピング アフィリエイトが有効か確認",
      ],
    };
  }

  if (status === 403) {
    return {
      category: "forbidden_unknown",
      summary:
        "403 Forbidden。認証（Client ID）とアフィリエイト設定の両方を確認してください",
      hints: [
        "レスポンス message に credentials 系の文言があれば Client ID を優先確認",
        "affiliate 系の文言があれば VC_SID / VC_PID を優先確認",
      ],
    };
  }

  return {
    category: "unknown",
    summary: "Yahoo Shopping API のエラー。レスポンス本文を確認してください",
    hints: [],
  };
}

function logYahooApiError({ status, bodyText, keyword, requestUrl }) {
  const parsed = parseYahooErrorBody(bodyText);
  const message = extractYahooErrorMessage(parsed, bodyText);
  const diagnosis = diagnoseYahooApiError(status, bodyText, parsed);

  console.error("[Yahoo Shopping API エラー]");
  console.error(`  HTTP status: ${status}`);
  console.error(`  レスポンス本文: ${bodyText}`);
  if (message != null && message !== bodyText) {
    console.error(`  message: ${message}`);
  }
  console.error(`  原因判定 [${diagnosis.category}]: ${diagnosis.summary}`);
  for (const hint of diagnosis.hints) {
    console.error(`    - ${hint}`);
  }
  if (keyword) {
    console.error(`  検索キーワード: ${keyword}`);
  }
  if (DEBUG) {
    console.error(`  appid: ${maskSecret(YAHOO_APP_ID)}`);
    console.error(`  VC_SID: ${VC_SID}, VC_PID: ${VC_PID}`);
    if (requestUrl) {
      console.error(
        `  リクエストURL: ${requestUrl.replace(YAHOO_APP_ID, maskSecret(YAHOO_APP_ID))}`,
      );
    }
  }
}

function buildYahooSearchUrl(keyword) {
  return (
    `${YAHOO_ENDPOINT}?` +
    [
      `appid=${encodeURIComponent(YAHOO_APP_ID)}`,
      "affiliate_type=vc",
      `affiliate_id=${VC_AFFILIATE_ID}`,
      `query=${encodeURIComponent(keyword)}`,
      "results=30",
      "sort=-review_count",
      "condition=new",
    ].join("&")
  );
}

async function searchYahoo(keyword) {
  const url = buildYahooSearchUrl(keyword);

  if (DEBUG) {
    console.log(
      `[DEBUG] Yahoo itemSearch: keyword="${keyword}", appid=${maskSecret(YAHOO_APP_ID)}`,
    );
  }

  const res = await fetch(url);
  const bodyText = await res.text();

  if (!res.ok) {
    logYahooApiError({
      status: res.status,
      bodyText,
      keyword,
      requestUrl: url,
    });
    throw new Error(`Yahoo Shopping API error: ${res.status} ${bodyText}`);
  }

  const data = parseYahooErrorBody(bodyText) ?? {};
  if (DEBUG) {
    console.log(
      `[DEBUG] Yahoo itemSearch OK: hits=${(data.hits ?? []).length}件`,
    );
  }
  return data.hits ?? [];
}

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

function findBestMatch(earphone, hits) {
  const normalizedModel = normalize(earphone.name);
  const currentPrice = earphone.price;

  const candidates = hits.filter((hit) => {
    const itemName = hit.name ?? "";
    const normalizedItemName = normalize(itemName);

    if (!normalizedItemName.includes(normalizedModel)) return false;

    if (EXCLUDE_KEYWORDS.some((kw) => itemName.includes(kw))) return false;

    const itemPrice = hit.price ?? null;
    if (currentPrice != null && currentPrice > 0 && itemPrice != null) {
      const ratio = itemPrice / currentPrice;
      if (ratio < 0.4 || ratio > 2.5) return false;
    }

    return true;
  });

  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) => (b.review?.count ?? 0) - (a.review?.count ?? 0),
  );
  return candidates[0];
}

function isValidAffiliateUrl(url) {
  return typeof url === "string" && url.includes("ck.jp.ap.valuecommerce.com");
}

async function main() {
  if (DRY_RUN) {
    console.log("*** DRY_RUN モード: 実際のDB更新は行いません ***\n");
  }
  if (SYNC_LIMIT != null && SYNC_LIMIT > 0) {
    console.log(`*** SYNC_LIMIT=${SYNC_LIMIT}: 先頭${SYNC_LIMIT}件のみ処理 ***\n`);
  }

  const { data: earphones, error } = await supabase
    .from("earphones")
    .select("id, name, brand, price, url, yahoo_url, yahoo_price")
    .order("brand")
    .order("name");

  if (error) {
    console.error("Supabaseからのデータ取得に失敗:", error);
    process.exit(1);
  }

  const targets =
    SYNC_LIMIT != null && SYNC_LIMIT > 0
      ? earphones.slice(0, SYNC_LIMIT)
      : earphones;

  console.log(`対象機種: ${targets.length}件\n`);

  const summary = { updated: [], skipped: [], failed: [] };

  for (const earphone of targets) {
    const keyword = buildSearchKeyword(earphone.brand, earphone.name);
    try {
      const hits = await searchYahoo(keyword);
      const match = findBestMatch(earphone, hits);

      if (!match) {
        summary.skipped.push({
          name: `${earphone.brand} ${earphone.name}`,
          reason: "一致する商品が見つかりませんでした",
        });
        await sleep(REQUEST_INTERVAL_MS);
        continue;
      }

      const yahooUrl = match.url;
      const yahooPrice = match.price ?? null;
      const yahooUpdatedAt = new Date().toISOString();

      if (!isValidAffiliateUrl(yahooUrl)) {
        summary.failed.push({
          name: `${earphone.brand} ${earphone.name}`,
          reason: `アフィリエイトURLが取得できませんでした: ${yahooUrl}`,
        });
        await sleep(REQUEST_INTERVAL_MS);
        continue;
      }

      if (DRY_RUN) {
        summary.updated.push({
          name: `${earphone.brand} ${earphone.name}`,
          yahooUrl,
          yahooPrice,
          shopPrice: earphone.price,
          itemName: match.name,
        });
      } else {
        const { error: updateError } = await supabase
          .from("earphones")
          .update({
            yahoo_url: yahooUrl,
            yahoo_price: yahooPrice,
            yahoo_updated_at: yahooUpdatedAt,
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
            yahooUrl,
            yahooPrice,
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
    `Yahoo!リンク更新${DRY_RUN ? "対象" : ""}: ${summary.updated.length}件`,
  );
  console.log(`スキップ(未マッチ): ${summary.skipped.length}件`);
  console.log(`失敗: ${summary.failed.length}件`);

  if (summary.updated.length > 0) {
    console.log("\n--- 更新一覧 ---");
    summary.updated.forEach((s) => {
      const ratio =
        s.shopPrice != null && s.shopPrice > 0 && s.yahooPrice != null
          ? (s.yahooPrice / s.shopPrice).toFixed(2)
          : "?";
      const priceInfo =
        s.shopPrice != null
          ? `Yahoo¥${s.yahooPrice} / ショップ¥${s.shopPrice} (${ratio}x)`
          : `Yahoo¥${s.yahooPrice}`;
      console.log(`- ${s.name}: ${priceInfo}`);
      if (s.itemName) console.log(`    ${s.itemName}`);
      console.log(`    ${s.yahooUrl}`);
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
