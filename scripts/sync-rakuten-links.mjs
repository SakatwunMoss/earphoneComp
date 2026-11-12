// earphonesテーブルの各機種を楽天市場で検索し、見つかった商品のアフィリエイトリンクを
// rakuten_url / rakuten_price / rakuten_updated_at に保存するバッチスクリプト。
// url / price 列（公式または現状掲載中ショップ）には一切書き込まない。
//
// 実行方法:
//   node scripts/sync-rakuten-links.mjs
//   DRY_RUN=true node scripts/sync-rakuten-links.mjs
//   DRY_RUN=true node scripts/sync-rakuten-links.mjs --clear-invalid
//
// 環境変数:
//   SUPABASE_URL               Supabaseプロジェクトの URL
//                              （未設定時は NEXT_PUBLIC_SUPABASE_URL を利用）
//   SUPABASE_SERVICE_ROLE_KEY  RLSをバイパスして書き込むためのService Role Key
//   RAKUTEN_APP_ID             楽天ウェブサービスのアプリID（UUID形式）
//   RAKUTEN_ACCESS_KEY         楽天ウェブサービスのアクセスキー
//   RAKUTEN_AFFILIATE_ID       楽天アフィリエイトID
//   RAKUTEN_ORIGIN             （任意）アプリ登録時の許可ドメイン
//   DRY_RUN                    "true"を指定すると実際の更新はせず、結果だけログ出力する
//   PRICE_RATIO_MIN / PRICE_RATIO_MAX / LOW_PRICE_THRESHOLD
//   LOW_PRICE_RATIO_MIN / LOW_PRICE_RATIO_MAX
//   REPORT_CSV                 （任意）DRY_RUN 時のCSV出力先。未指定時は scripts/tmp/rakuten-dry-run.csv

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
const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID?.trim();
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY?.trim();
const RAKUTEN_AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID?.trim();
const RAKUTEN_ORIGIN = process.env.RAKUTEN_ORIGIN?.trim();
const DRY_RUN = process.env.DRY_RUN === "true";
const { clearInvalid } = parseCliFlags();
const priceConfig = getPriceGuardConfig();

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

const RAKUTEN_ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
const REQUEST_INTERVAL_MS = 1100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function mapRakutenItem(item) {
  return {
    itemName: item.itemName ?? "",
    itemPrice: item.itemPrice ?? null,
    itemBrand: item.shopName ?? null,
    itemUrl: item.affiliateUrl || item.itemUrl || "",
    reviewCount: item.reviewCount ?? 0,
    raw: item,
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

function tryWritePriceSuggestions(ownRows, otherCsvRelPath, ownStore) {
  const otherCsvPath = resolve(process.cwd(), otherCsvRelPath);
  if (!existsSync(otherCsvPath)) {
    console.log(
      `\nprice_suggestion: ${otherCsvRelPath} がまだ無いためスキップ（両方揃った後に再生成）`,
    );
    return;
  }
  const otherRows = parseSimpleCsv(readFileSync(otherCsvPath, "utf-8"));
  const rakutenRows = ownStore === "rakuten" ? ownRows : otherRows;
  const yahooRows = ownStore === "yahoo" ? ownRows : otherRows;
  const suggestions = buildPriceSuggestions(rakutenRows, yahooRows);
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

function writeDryRunSummary(ownRows, otherCsvRelPath) {
  const rows = [...ownRows];
  const otherCsvPath = resolve(process.cwd(), otherCsvRelPath);
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

function resolveReportPath() {
  if (process.env.REPORT_CSV?.trim()) return resolve(process.env.REPORT_CSV.trim());
  return resolve(process.cwd(), "scripts/tmp/rakuten-dry-run.csv");
}

async function main() {
  if (DRY_RUN) {
    console.log("*** DRY_RUN モード: 実際のDB更新は行いません ***\n");
  }
  if (clearInvalid) {
    console.log("*** --clear-invalid: 範囲外の既存店舗価格を NULL 化します ***\n");
  }
  console.log(
    `価格ガード: 通常 ${priceConfig.ratioMin}–${priceConfig.ratioMax} / ` +
      `${priceConfig.lowThreshold}円未満 ${priceConfig.lowMin}–${priceConfig.lowMax}\n`,
  );

  const searchAliases = loadSearchAliases();

  const { data: earphones, error } = await supabase
    .from("earphones")
    .select(
      "id, name, brand, price, url, rakuten_url, rakuten_price, rakuten_updated_at, yahoo_url, yahoo_price, yahoo_updated_at",
    )
    .order("brand")
    .order("name");

  if (error) {
    console.error("Supabaseからのデータ取得に失敗:", error);
    process.exit(1);
  }

  console.log(`対象機種: ${earphones.length}件\n`);

  const variantIndex = buildVariantIndex(earphones);
  const longerNameIndex = buildLongerNameIndex(earphones);
  const matchOptions = {
    variantIndex,
    longerNameIndex,
    mapItem: mapRakutenItem,
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

  for (const earphone of earphones) {
    if (isStaleSuspect(earphone.rakuten_price, earphone.price, priceConfig)) {
      staleSuspects.push({
        id: earphone.id,
        brand: earphone.brand,
        name: earphone.name,
        price: earphone.price,
        rakuten_price: earphone.rakuten_price,
        rakuten_url: earphone.rakuten_url,
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
    if (isStaleLink(earphone.rakuten_updated_at)) {
      staleLinks.push({
        id: earphone.id,
        brand: earphone.brand,
        name: earphone.name,
        store: "rakuten",
        updated_at: earphone.rakuten_updated_at,
        url: earphone.rakuten_url,
      });
    }

    const keywords = buildSearchKeywordList(
      earphone.brand,
      earphone.name,
      searchAliases,
    );
    try {
      const {
        items,
        keywordUsed,
        hitCount,
        attempts,
      } = await searchWithKeywordFallback(searchRakuten, keywords, {
        sleep,
        intervalMs: REQUEST_INTERVAL_MS,
      });
      const searchMeta = searchMetaFields({
        keywordUsed,
        hitCount,
        attempts,
      });
      const result = findBestMatch(earphone, items, matchOptions);

      if (result.decision === "hold") {
        const match = result.match;
        const rakutenUrl = match?.affiliateUrl || match?.itemUrl || "";
        const rakutenPrice = match?.itemPrice ?? null;
        reportRows.push({
          id: earphone.id,
          brand: earphone.brand,
          name: earphone.name,
          store: "rakuten",
          old_url: earphone.rakuten_url,
          new_url: rakutenUrl,
          old_price: earphone.rakuten_price,
          new_price: rakutenPrice,
          ratio: result.ratio != null ? Number(result.ratio.toFixed(4)) : "",
          decision: "hold",
          reason: result.reason,
          catalog_price: earphone.price,
          ...emptyRejectExtras(),
          ...searchMeta,
          ...probeFieldsFromMatch(result),
        });
        summary.held.push({
          name: `${earphone.brand} ${earphone.name}`,
          reason: result.reason,
          itemName: match?.itemName,
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
          store: "rakuten",
          old_url: earphone.rakuten_url,
          new_url: "",
          old_price: earphone.rakuten_price,
          new_price: "",
          ratio: "",
          decision: "reject",
          reason: result.reason,
          catalog_price: earphone.price,
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
          isStaleSuspect(earphone.rakuten_price, earphone.price, priceConfig)
        ) {
          if (!DRY_RUN) {
            const { error: clearError } = await supabase
              .from("earphones")
              .update({
                rakuten_url: null,
                rakuten_price: null,
                rakuten_updated_at: new Date().toISOString(),
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
      const rakutenUrl = match.affiliateUrl || match.itemUrl;
      const rakutenPrice = match.itemPrice ?? null;

      pendingAccepts.push({
        earphone,
        rakutenUrl,
        rakutenPrice,
        itemName: match.itemName,
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
        store: "rakuten",
        old_url: earphone.rakuten_url,
        new_url: "",
        old_price: earphone.rakuten_price,
        new_price: "",
        ratio: "",
        decision: "reject",
        reason: `error:${err.message}`,
        catalog_price: earphone.price,
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
      url: p.rakutenUrl,
      decision: "accept",
    })),
  );

  for (const pending of pendingAccepts) {
    const { earphone, rakutenUrl, rakutenPrice, itemName, ratio } = pending;

    if (dupIds.has(earphone.id)) {
      reportRows.push({
        id: earphone.id,
        brand: earphone.brand,
        name: earphone.name,
        store: "rakuten",
        old_url: earphone.rakuten_url,
        new_url: rakutenUrl,
        old_price: earphone.rakuten_price,
        new_price: rakutenPrice,
        ratio: ratio != null ? Number(ratio.toFixed(4)) : "",
        decision: "reject",
        reason: "duplicate_url",
        catalog_price: earphone.price,
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
      store: "rakuten",
      old_url: earphone.rakuten_url,
      new_url: rakutenUrl,
      old_price: earphone.rakuten_price,
      new_price: rakutenPrice,
      ratio: ratio != null ? Number(ratio.toFixed(4)) : "",
      decision: "accept",
      reason: acceptReason,
      catalog_price: earphone.price,
      ...emptyRejectExtras(),
      ...(pending.searchMeta ?? {}),
      ...probeFieldsFromMatch({ priceProbe: pending.priceProbe }),
    });

    if (DRY_RUN) {
      summary.updated.push({
        name: `${earphone.brand} ${earphone.name}`,
        rakutenUrl,
        rakutenPrice,
        shopPrice: earphone.price,
        itemName,
        previousUrl: earphone.rakuten_url,
        previousPrice: earphone.rakuten_price,
        ratio,
        reason: acceptReason,
      });
    } else {
      const { error: updateError } = await supabase
        .from("earphones")
        .update({
          rakuten_url: rakutenUrl,
          rakuten_price: rakutenPrice,
          rakuten_updated_at: new Date().toISOString(),
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
  }

  const reportSummary = summarizeReport(reportRows);

  console.log("=== 更新結果 ===");
  console.log(
    `楽天リンク更新${DRY_RUN ? "対象" : ""}: ${summary.updated.length}件`,
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
        `- ${s.brand} ${s.name}: price¥${s.price} / rakuten¥${s.rakuten_price}`,
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
          : s.shopPrice != null && s.shopPrice > 0 && s.rakutenPrice != null
            ? (s.rakutenPrice / s.shopPrice).toFixed(2)
            : "?";
      const priceInfo =
        s.shopPrice != null
          ? `楽天¥${s.rakutenPrice} / ショップ¥${s.shopPrice} (${ratio}x)`
          : `楽天¥${s.rakutenPrice}`;
      const flag = s.reason ? ` [${s.reason}]` : "";
      console.log(`- ${s.name}: ${priceInfo}${flag}`);
      if (s.itemName) console.log(`    ${s.itemName}`);
      console.log(`    ${s.rakutenUrl}`);
      if (
        DRY_RUN &&
        s.previousUrl != null &&
        s.previousUrl !== s.rakutenUrl
      ) {
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
    tryWritePriceSuggestions(
      reportRows,
      "scripts/tmp/yahoo-dry-run.csv",
      "rakuten",
    );
    writeDryRunSummary(reportRows, "scripts/tmp/yahoo-dry-run.csv");
  }
}

main();
