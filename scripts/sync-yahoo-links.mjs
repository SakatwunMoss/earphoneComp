// earphonesテーブルの各機種をYahoo!ショッピングで検索し、見つかった商品のアフィリエイトリンクを
// yahoo_url / yahoo_price / yahoo_updated_at に保存するバッチスクリプト。
// url / price 列（公式または現状掲載中ショップ）には一切書き込まない。
//
// 実行方法:
//   node scripts/sync-yahoo-links.mjs
//   DRY_RUN=true node scripts/sync-yahoo-links.mjs
//   DRY_RUN=true node scripts/sync-yahoo-links.mjs --clear-invalid
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
//   PRICE_RATIO_MIN / PRICE_RATIO_MAX / LOW_PRICE_THRESHOLD
//   LOW_PRICE_RATIO_MIN / LOW_PRICE_RATIO_MAX
//   REPORT_CSV                 （任意）DRY_RUN 時のCSV出力先。未指定時は scripts/tmp/yahoo-dry-run.csv

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import {
  buildLongerNameIndex,
  buildPriceSuggestions,
  buildSearchKeywordList,
  buildVariantIndex,
  emptyRejectExtras,
  findBestMatch,
  findDuplicateUrlIds,
  formatDryRunSummaryMarkdown,
  formatPriceSuggestionSql,
  formatReportCsv,
  getPriceGuardConfig,
  isPriceStaleSuspect,
  isStaleLink,
  isStaleSuspect,
  parseCliFlags,
  parseSimpleCsv,
  PRICE_SUGGESTION_COLUMNS,
  probeFieldsFromMatch,
  rejectExtrasFromMatch,
  searchMetaFields,
  searchWithKeywordFallback,
  summarizeReport,
} from "./lib/affiliate-match.mjs";

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
const { clearInvalid } = parseCliFlags();
const priceConfig = getPriceGuardConfig();

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

const VC_AFFILIATE_ID = encodeURIComponent(
  `http://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${VC_SID}&pid=${VC_PID}&vc_url=`,
);

const REQUEST_INTERVAL_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function mapYahooItem(hit) {
  return {
    itemName: hit.name ?? "",
    itemPrice: hit.price ?? null,
    itemBrand: hit.brand?.name ?? hit.seller?.name ?? null,
    itemUrl: hit.url ?? "",
    reviewCount: hit.review?.count ?? 0,
    raw: hit,
  };
}

function loadSearchAliases() {
  const path = resolve(process.cwd(), "scripts/data/search-aliases.json");
  if (!existsSync(path)) return {};
  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    console.warn(`search-aliases.json の読み込みに失敗: ${path}`);
    return {};
  }
}

function tryWritePriceSuggestions(ownRows) {
  const otherCsvPath = resolve(process.cwd(), "scripts/tmp/rakuten-dry-run.csv");
  if (!existsSync(otherCsvPath)) {
    console.log(
      "\nprice_suggestion: scripts/tmp/rakuten-dry-run.csv がまだ無いためスキップ（両方揃った後に再生成）",
    );
    return;
  }
  const rakutenRows = parseSimpleCsv(readFileSync(otherCsvPath, "utf-8"));
  const suggestions = buildPriceSuggestions(rakutenRows, ownRows);
  const csvPath = resolve(process.cwd(), "scripts/tmp/price-suggestion.csv");
  const sqlPath = resolve(
    process.cwd(),
    "scripts/tmp/price-update-suggestion.sql",
  );
  mkdirSync(dirname(csvPath), { recursive: true });
  writeFileSync(
    csvPath,
    formatReportCsv(suggestions, PRICE_SUGGESTION_COLUMNS),
    "utf-8",
  );
  writeFileSync(sqlPath, formatPriceSuggestionSql(suggestions), "utf-8");
  const auto = suggestions.filter((s) => s.status === "suggest");
  const listOnly = suggestions.filter((s) => s.status === "list_only");
  const review = suggestions.filter((s) => s.status === "needs_review");
  console.log(
    `\n--- price_suggestion: 自動${auto.length} / 一覧のみ${listOnly.length} / 要確認${review.length} ---`,
  );
  for (const s of suggestions) {
    console.log(
      `- [${s.status}] ${s.brand} ${s.name}: ¥${s.price} → ¥${s.suggested_price}` +
        ` (比${s.suggest_to_price_ratio})` +
        `\n    楽天出品: ${s.rakuten_probe_title} (¥${s.rakuten_probe_price})` +
        `\n    Yahoo出品: ${s.yahoo_probe_title} (¥${s.yahoo_probe_price})`,
    );
  }
  console.log(`CSV: ${csvPath}`);
  console.log(`SQL(コメントのみ・実行しない): ${sqlPath}`);
}

function writeDryRunSummary(ownRows) {
  const rows = [...ownRows];
  const otherCsvPath = resolve(process.cwd(), "scripts/tmp/rakuten-dry-run.csv");
  if (existsSync(otherCsvPath)) {
    rows.push(...parseSimpleCsv(readFileSync(otherCsvPath, "utf-8")));
  }
  const md = formatDryRunSummaryMarkdown(rows);
  const outPath = resolve(process.cwd(), "scripts/tmp/dry-run-summary.md");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, md, "utf-8");
  console.log(`\n--- dry-run-summary (reject/hold) ---`);
  process.stdout.write(md);
  console.log(`\n要約MD: ${outPath}`);
}

function isValidAffiliateUrl(url) {
  return typeof url === "string" && url.includes("ck.jp.ap.valuecommerce.com");
}

function resolveReportPath() {
  if (process.env.REPORT_CSV?.trim()) return resolve(process.env.REPORT_CSV.trim());
  return resolve(process.cwd(), "scripts/tmp/yahoo-dry-run.csv");
}

async function main() {
  if (DRY_RUN) {
    console.log("*** DRY_RUN モード: 実際のDB更新は行いません ***\n");
  }
  if (clearInvalid) {
    console.log("*** --clear-invalid: 範囲外の既存店舗価格を NULL 化します ***\n");
  }
  if (SYNC_LIMIT != null && SYNC_LIMIT > 0) {
    console.log(`*** SYNC_LIMIT=${SYNC_LIMIT}: 先頭${SYNC_LIMIT}件のみ処理 ***\n`);
  }
  console.log(
    `価格ガード: 通常 ${priceConfig.ratioMin}–${priceConfig.ratioMax} / ` +
      `${priceConfig.lowThreshold}円未満 ${priceConfig.lowMin}–${priceConfig.lowMax}\n`,
  );

  const searchAliases = loadSearchAliases();

  const { data: earphones, error } = await supabase
    .from("earphones")
    .select(
      "id, name, brand, price, url, yahoo_url, yahoo_price, yahoo_updated_at, rakuten_url, rakuten_price, rakuten_updated_at",
    )
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

  const variantIndex = buildVariantIndex(earphones);
  const longerNameIndex = buildLongerNameIndex(earphones);
  const matchOptions = {
    variantIndex,
    longerNameIndex,
    mapItem: mapYahooItem,
    config: priceConfig,
  };

  /** @type {Array<Record<string, unknown>>} */
  const reportRows = [];
  const pendingAccepts = [];
  const summary = {
    updated: [],
    skipped: [],
    held: [],
    failed: [],
    cleared: [],
  };
  const staleSuspects = [];
  const priceStaleSuspects = [];
  const staleLinks = [];

  for (const earphone of targets) {
    if (isStaleSuspect(earphone.yahoo_price, earphone.price, priceConfig)) {
      staleSuspects.push({
        id: earphone.id,
        brand: earphone.brand,
        name: earphone.name,
        price: earphone.price,
        yahoo_price: earphone.yahoo_price,
        yahoo_url: earphone.yahoo_url,
      });
    }
    if (
      isPriceStaleSuspect(
        earphone.price,
        earphone.rakuten_price,
        earphone.yahoo_price,
      )
    ) {
      priceStaleSuspects.push({
        id: earphone.id,
        brand: earphone.brand,
        name: earphone.name,
        price: earphone.price,
        rakuten_price: earphone.rakuten_price,
        yahoo_price: earphone.yahoo_price,
      });
    }
    if (isStaleLink(earphone.yahoo_updated_at)) {
      staleLinks.push({
        id: earphone.id,
        brand: earphone.brand,
        name: earphone.name,
        store: "yahoo",
        updated_at: earphone.yahoo_updated_at,
        url: earphone.yahoo_url,
      });
    }

    const keywords = buildSearchKeywordList(
      earphone.brand,
      earphone.name,
      searchAliases,
    );
    try {
      const {
        items: hits,
        keywordUsed,
        hitCount,
        attempts,
      } = await searchWithKeywordFallback(searchYahoo, keywords, {
        sleep,
        intervalMs: REQUEST_INTERVAL_MS,
      });
      const searchMeta = searchMetaFields({
        keywordUsed,
        hitCount,
        attempts,
      });
      const result = findBestMatch(earphone, hits, matchOptions);

      if (result.decision === "hold") {
        const match = result.match;
        const yahooUrl = match?.url ?? "";
        const yahooPrice = match?.price ?? null;
        reportRows.push({
          id: earphone.id,
          brand: earphone.brand,
          name: earphone.name,
          store: "yahoo",
          catalog_price: earphone.price,
          old_url: earphone.yahoo_url,
          new_url: yahooUrl,
          old_price: earphone.yahoo_price,
          new_price: yahooPrice,
          ratio: result.ratio != null ? Number(result.ratio.toFixed(4)) : "",
          decision: "hold",
          reason: result.reason,
          ...emptyRejectExtras(),
          ...searchMeta,
          ...probeFieldsFromMatch(result),
        });
        summary.held.push({
          name: `${earphone.brand} ${earphone.name}`,
          reason: result.reason,
          itemName: match?.name,
          keywordUsed,
          hitCount,
        });
        await sleep(REQUEST_INTERVAL_MS);
        continue;
      }

      if (result.decision !== "accept") {
        reportRows.push({
          id: earphone.id,
          brand: earphone.brand,
          name: earphone.name,
          store: "yahoo",
          catalog_price: earphone.price,
          old_url: earphone.yahoo_url,
          new_url: "",
          old_price: earphone.yahoo_price,
          new_price: "",
          ratio: "",
          decision: "reject",
          reason: result.reason,
          ...rejectExtrasFromMatch(result),
          ...searchMeta,
        });
        summary.skipped.push({
          name: `${earphone.brand} ${earphone.name}`,
          reason: result.reason,
          rejectedTitle: result.rejectedTitle,
          topTitles: result.topTitles,
          excludeTitles: result.excludeTitles,
          keywordUsed,
          hitCount,
          keywordHitCounts: searchMeta.keyword_hit_counts,
        });

        if (
          clearInvalid &&
          isStaleSuspect(earphone.yahoo_price, earphone.price, priceConfig)
        ) {
          if (!DRY_RUN) {
            const { error: clearError } = await supabase
              .from("earphones")
              .update({
                yahoo_url: null,
                yahoo_price: null,
                yahoo_updated_at: new Date().toISOString(),
              })
              .eq("id", earphone.id);
            if (clearError) {
              summary.failed.push({
                name: `${earphone.brand} ${earphone.name}`,
                reason: clearError.message,
              });
            } else {
              summary.cleared.push(`${earphone.brand} ${earphone.name}`);
            }
          } else {
            summary.cleared.push(`${earphone.brand} ${earphone.name}`);
          }
        }

        await sleep(REQUEST_INTERVAL_MS);
        continue;
      }

      const match = result.match;
      const yahooUrl = match.url;
      const yahooPrice = match.price ?? null;

      if (!isValidAffiliateUrl(yahooUrl)) {
        reportRows.push({
          id: earphone.id,
          brand: earphone.brand,
          name: earphone.name,
          store: "yahoo",
          catalog_price: earphone.price,
          old_url: earphone.yahoo_url,
          new_url: yahooUrl ?? "",
          old_price: earphone.yahoo_price,
          new_price: yahooPrice,
          ratio: result.ratio != null ? Number(result.ratio.toFixed(4)) : "",
          decision: "reject",
          reason: "invalid_affiliate_url",
          ...emptyRejectExtras(),
          ...searchMeta,
          ...probeFieldsFromMatch(result),
        });
        summary.failed.push({
          name: `${earphone.brand} ${earphone.name}`,
          reason: `アフィリエイトURLが取得できませんでした: ${yahooUrl}`,
        });
        await sleep(REQUEST_INTERVAL_MS);
        continue;
      }

      pendingAccepts.push({
        earphone,
        yahooUrl,
        yahooPrice,
        itemName: match.name,
        ratio: result.ratio,
        reason: result.reason,
        priceProbe: result.priceProbe,
        searchMeta,
      });
    } catch (err) {
      reportRows.push({
        id: earphone.id,
        brand: earphone.brand,
        name: earphone.name,
        store: "yahoo",
        catalog_price: earphone.price,
        old_url: earphone.yahoo_url,
        new_url: "",
        old_price: earphone.yahoo_price,
        new_price: "",
        ratio: "",
        decision: "reject",
        reason: `error:${err.message}`,
        ...emptyRejectExtras(),
      });
      summary.failed.push({
        name: `${earphone.brand} ${earphone.name}`,
        reason: err.message,
      });
    }

    await sleep(REQUEST_INTERVAL_MS);
  }

  const dupIds = findDuplicateUrlIds(
    pendingAccepts.map((p) => ({
      id: p.earphone.id,
      url: p.yahooUrl,
      decision: "accept",
    })),
  );

  for (const pending of pendingAccepts) {
    const { earphone, yahooUrl, yahooPrice, itemName, ratio } = pending;

    if (dupIds.has(earphone.id)) {
      reportRows.push({
        id: earphone.id,
        brand: earphone.brand,
        name: earphone.name,
        store: "yahoo",
        catalog_price: earphone.price,
        old_url: earphone.yahoo_url,
        new_url: yahooUrl,
        old_price: earphone.yahoo_price,
        new_price: yahooPrice,
        ratio: ratio != null ? Number(ratio.toFixed(4)) : "",
        decision: "reject",
        reason: "duplicate_url",
        ...emptyRejectExtras(),
        ...probeFieldsFromMatch({ priceProbe: pending.priceProbe }),
      });
      summary.skipped.push({
        name: `${earphone.brand} ${earphone.name}`,
        reason: "duplicate_url",
      });
      continue;
    }

    const acceptReason = pending.reason ?? "";
    reportRows.push({
      id: earphone.id,
      brand: earphone.brand,
      name: earphone.name,
      store: "yahoo",
      catalog_price: earphone.price,
      old_url: earphone.yahoo_url,
      new_url: yahooUrl,
      old_price: earphone.yahoo_price,
      new_price: yahooPrice,
      ratio: ratio != null ? Number(ratio.toFixed(4)) : "",
      decision: "accept",
      reason: acceptReason,
      ...emptyRejectExtras(),
      ...(pending.searchMeta ?? {}),
      ...probeFieldsFromMatch({ priceProbe: pending.priceProbe }),
    });

    if (DRY_RUN) {
      summary.updated.push({
        name: `${earphone.brand} ${earphone.name}`,
        yahooUrl,
        yahooPrice,
        shopPrice: earphone.price,
        itemName,
        previousUrl: earphone.yahoo_url,
        previousPrice: earphone.yahoo_price,
        ratio,
        reason: acceptReason,
      });
    } else {
      const { error: updateError } = await supabase
        .from("earphones")
        .update({
          yahoo_url: yahooUrl,
          yahoo_price: yahooPrice,
          yahoo_updated_at: new Date().toISOString(),
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
  }

  const reportSummary = summarizeReport(reportRows);

  console.log("=== 更新結果 ===");
  console.log(
    `Yahoo!リンク更新${DRY_RUN ? "対象" : ""}: ${summary.updated.length}件`,
  );
  console.log(`hold(variant_suspect等・DB未更新): ${summary.held.length}件`);
  console.log(`スキップ(未マッチ/却下): ${summary.skipped.length}件`);
  console.log(`失敗: ${summary.failed.length}件`);
  if (clearInvalid) {
    console.log(`clear-invalid 対象: ${summary.cleared.length}件`);
  }

  console.log("\n--- レポート件数サマリ ---");
  console.log(`accept: ${reportSummary.accept}`);
  console.log(`hold: ${reportSummary.hold}`);
  console.log(`reject: ${reportSummary.reject}`);
  for (const [reason, count] of Object.entries(reportSummary.byReason).sort()) {
    console.log(`  ${reason}: ${count}`);
  }

  if (staleSuspects.length > 0) {
    console.log(`\n--- stale_suspect: ${staleSuspects.length}件 ---`);
    for (const s of staleSuspects) {
      console.log(
        `- ${s.brand} ${s.name}: price¥${s.price} / yahoo¥${s.yahoo_price}`,
      );
    }
  }

  if (priceStaleSuspects.length > 0) {
    console.log(`\n--- price_stale_suspect: ${priceStaleSuspects.length}件 ---`);
    for (const s of priceStaleSuspects) {
      console.log(
        `- ${s.brand} ${s.name}: price¥${s.price} / rakuten¥${s.rakuten_price} / yahoo¥${s.yahoo_price}`,
      );
    }
  }

  if (staleLinks.length > 0) {
    console.log(`\n--- stale_link: ${staleLinks.length}件 ---`);
    for (const s of staleLinks) {
      console.log(
        `- ${s.brand} ${s.name} [${s.store}]: updated_at=${s.updated_at}`,
      );
    }
  }

  const variantSuspectRows = reportRows.filter(
    (r) =>
      r.decision === "hold" &&
      typeof r.reason === "string" &&
      r.reason.startsWith("variant_suspect"),
  );
  if (variantSuspectRows.length > 0) {
    console.log(`\n--- variant_suspect (hold): ${variantSuspectRows.length}件 ---`);
    for (const r of variantSuspectRows) {
      console.log(`- ${r.brand} ${r.name}: ${r.reason}`);
    }
  }

  const noMatchRows = summary.skipped.filter((s) => s.reason === "no_match");
  if (noMatchRows.length > 0) {
    console.log(`\n--- no_match 上位タイトル: ${noMatchRows.length}件 ---`);
    for (const s of noMatchRows) {
      console.log(
        `- ${s.name} (keyword_used="${s.keywordUsed ?? ""}" hit_count=${s.hitCount ?? 0})`,
      );
      if (s.keywordHitCounts) {
        console.log(`    keyword_hit_counts: ${s.keywordHitCounts}`);
      }
      const titles = s.topTitles ?? [];
      if (titles.length === 0) {
        console.log("    (検索結果0件)");
      } else {
        for (const [i, t] of titles.entries()) {
          console.log(`    [${i + 1}] ${t}`);
        }
      }
    }
  }

  const excludeRows = summary.skipped.filter((s) =>
    String(s.reason).startsWith("exclude_keyword"),
  );
  if (excludeRows.length > 0) {
    console.log(`\n--- exclude_keyword 候補タイトル: ${excludeRows.length}件 ---`);
    for (const s of excludeRows) {
      console.log(`- ${s.name}: ${s.reason}`);
      for (const t of s.excludeTitles ?? []) {
        console.log(`    ${t}`);
      }
    }
  }

  if (summary.updated.length > 0) {
    console.log("\n--- 更新一覧 ---");
    summary.updated.forEach((s) => {
      const ratio =
        s.ratio != null
          ? s.ratio.toFixed(2)
          : s.shopPrice != null && s.shopPrice > 0 && s.yahooPrice != null
            ? (s.yahooPrice / s.shopPrice).toFixed(2)
            : "?";
      const priceInfo =
        s.shopPrice != null
          ? `Yahoo¥${s.yahooPrice} / ショップ¥${s.shopPrice} (${ratio}x)`
          : `Yahoo¥${s.yahooPrice}`;
      const flag = s.reason ? ` [${s.reason}]` : "";
      console.log(`- ${s.name}: ${priceInfo}${flag}`);
      if (s.itemName) console.log(`    ${s.itemName}`);
      console.log(`    ${s.yahooUrl}`);
      if (DRY_RUN && s.previousUrl != null && s.previousUrl !== s.yahooUrl) {
        console.log(`    [差分] 旧URL: ${s.previousUrl}`);
        console.log(`    [差分] 旧価格: ¥${s.previousPrice}`);
      }
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

  if (DRY_RUN) {
    const csv = formatReportCsv(reportRows);
    const outPath = resolveReportPath();
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, csv, "utf-8");
    console.log(`\nCSVレポート: ${outPath}`);
    console.log("--- CSV (stdout) ---");
    process.stdout.write(csv);
    tryWritePriceSuggestions(reportRows);
    writeDryRunSummary(reportRows);
  }
}

main();
