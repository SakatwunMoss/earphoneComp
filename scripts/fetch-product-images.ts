import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { Database } from "../src/types/database";

function loadEnvLocal(): void {
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

function resolveAbsoluteUrl(baseUrl: string, imageUrl: string): string {
  try {
    return new URL(imageUrl.trim(), baseUrl).href;
  } catch {
    return imageUrl.trim();
  }
}

function parseDimension(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseInt(value.replace(/px$/i, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

const IMG_PRIORITY_KEYWORDS = [
  "product",
  "hero",
  "main",
  "primary",
  "gallery",
  "item",
];

function scoreImgKeywords(alt: string, className: string): number {
  const text = `${alt} ${className}`.toLowerCase();
  let score = 0;
  for (const keyword of IMG_PRIORITY_KEYWORDS) {
    if (text.includes(keyword)) score += 500;
  }
  return score;
}

function parseSrcsetBestUrl(srcset: string): { url: string; size: number } | null {
  const entries = srcset
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  let bestUrl: string | null = null;
  let bestSize = 0;

  for (const entry of entries) {
    const match = entry.match(/^(\S+)\s+(\d+(?:\.\d+)?)(w|x)?$/i);
    if (!match) {
      const urlOnly = entry.split(/\s+/)[0];
      if (urlOnly && !urlOnly.startsWith("data:")) {
        if (bestSize === 0) {
          bestUrl = urlOnly;
          bestSize = 300;
        }
      }
      continue;
    }

    const [, url, valueStr, unit = "w"] = match;
    if (!url || url.startsWith("data:")) continue;

    const value = parseFloat(valueStr);
    const size = unit.toLowerCase() === "x" ? value * 400 : value;

    if (size > bestSize) {
      bestSize = size;
      bestUrl = url;
    }
  }

  return bestUrl ? { url: bestUrl, size: bestSize } : null;
}

function normalizeSchemaType(type: unknown): string[] {
  if (typeof type === "string") return [type];
  if (Array.isArray(type)) {
    return type.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function isProductType(type: unknown): boolean {
  return normalizeSchemaType(type).some(
    (value) => value === "Product" || value.endsWith("/Product"),
  );
}

function extractImageFromJsonLdValue(image: unknown): string | null {
  if (typeof image === "string" && image.trim()) return image.trim();

  if (Array.isArray(image)) {
    for (const item of image) {
      const url = extractImageFromJsonLdValue(item);
      if (url) return url;
    }
    return null;
  }

  if (image && typeof image === "object") {
    const record = image as Record<string, unknown>;
    if (typeof record.url === "string" && record.url.trim()) {
      return record.url.trim();
    }
    if (typeof record.contentUrl === "string" && record.contentUrl.trim()) {
      return record.contentUrl.trim();
    }
  }

  return null;
}

function findProductImageInJsonLdNode(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const image = findProductImageInJsonLdNode(item);
      if (image) return image;
    }
    return null;
  }

  const record = node as Record<string, unknown>;

  if (isProductType(record["@type"])) {
    const image = extractImageFromJsonLdValue(record.image);
    if (image) return image;
  }

  if (Array.isArray(record["@graph"])) {
    const image = findProductImageInJsonLdNode(record["@graph"]);
    if (image) return image;
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const image = findProductImageInJsonLdNode(value);
      if (image) return image;
    }
  }

  return null;
}

function extractImageFromJsonLd(html: string): string | null {
  const $ = cheerio.load(html);

  for (const element of $('script[type="application/ld+json"]').toArray()) {
    const raw = $(element).html()?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const image = findProductImageInJsonLdNode(parsed);
      if (image) return image;
    } catch {
      // 壊れた JSON-LD はスキップ
    }
  }

  return null;
}

type ImageExtractionResult = {
  imageUrl: string | null;
  hasOgImage: boolean;
  hasTwitterImage: boolean;
  imgCandidateCount: number;
  source: "json-ld" | "og" | "twitter" | "img" | null;
};

function extractImageUrl(html: string, pageUrl: string): ImageExtractionResult {
  const $ = cheerio.load(html);

  const ogImage =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[property="og:image:url"]').attr("content");
  const hasOgImage = Boolean(ogImage?.trim());

  const twitterImage =
    $('meta[name="twitter:image"]').attr("content") ??
    $('meta[name="twitter:image:src"]').attr("content");
  const hasTwitterImage = Boolean(twitterImage?.trim());

  const jsonLdImage = extractImageFromJsonLd(html);
  if (jsonLdImage) {
    return {
      imageUrl: resolveAbsoluteUrl(pageUrl, jsonLdImage),
      hasOgImage,
      hasTwitterImage,
      imgCandidateCount: 0,
      source: "json-ld",
    };
  }

  if (ogImage) {
    return {
      imageUrl: resolveAbsoluteUrl(pageUrl, ogImage),
      hasOgImage,
      hasTwitterImage,
      imgCandidateCount: 0,
      source: "og",
    };
  }

  if (twitterImage) {
    return {
      imageUrl: resolveAbsoluteUrl(pageUrl, twitterImage),
      hasOgImage,
      hasTwitterImage,
      imgCandidateCount: 0,
      source: "twitter",
    };
  }

  type ImgCandidate = {
    url: string;
    keywordScore: number;
    sizeScore: number;
  };
  const candidates: ImgCandidate[] = [];

  $("img").each((_, element) => {
    const $el = $(element);
    const alt = $el.attr("alt") ?? "";
    const className = $el.attr("class") ?? "";
    const keywordScore = scoreImgKeywords(alt, className);

    const srcCandidates = [
      $el.attr("src"),
      $el.attr("data-src"),
      $el.attr("data-lazy-src"),
      $el.attr("data-original"),
    ].filter((value): value is string => Boolean(value?.trim()));

    const width = parseDimension($el.attr("width"));
    const height = parseDimension($el.attr("height"));
    const attrSize = Math.max(width, height);

    const srcset = $el.attr("srcset") ?? $el.attr("data-srcset");
    const srcsetBest = srcset ? parseSrcsetBestUrl(srcset) : null;
    const sizeScore = Math.max(attrSize, srcsetBest?.size ?? 0);

    for (const src of srcCandidates) {
      if (src.startsWith("data:")) continue;
      candidates.push({ url: src, keywordScore, sizeScore });
    }

    if (srcsetBest && !srcCandidates.includes(srcsetBest.url)) {
      candidates.push({
        url: srcsetBest.url,
        keywordScore,
        sizeScore: srcsetBest.size,
      });
    }
  });

  const imgCandidateCount = candidates.length;

  if (candidates.length === 0) {
    return {
      imageUrl: null,
      hasOgImage,
      hasTwitterImage,
      imgCandidateCount,
      source: null,
    };
  }

  const best = candidates.reduce((current, candidate) => {
    const currentRank = current.keywordScore * 10_000 + current.sizeScore;
    const candidateRank = candidate.keywordScore * 10_000 + candidate.sizeScore;
    return candidateRank > currentRank ? candidate : current;
  });

  const acceptable =
    best.keywordScore > 0 || best.sizeScore >= 300;

  if (!acceptable) {
    return {
      imageUrl: null,
      hasOgImage,
      hasTwitterImage,
      imgCandidateCount,
      source: null,
    };
  }

  return {
    imageUrl: resolveAbsoluteUrl(pageUrl, best.url),
    hasOgImage,
    hasTwitterImage,
    imgCandidateCount,
    source: "img",
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function randomDelay(): Promise<void> {
  const ms = 1000 + Math.random() * 1000;
  return delay(ms);
}

function isRetryableFetchError(status: number | undefined, message: string): boolean {
  if (status !== undefined && status >= 500 && status <= 599) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("network") ||
    lower.includes("econnreset") ||
    lower.includes("fetch failed")
  );
}

type FetchPageResult =
  | { ok: true; html: string; status: number }
  | { ok: false; status?: number; reason: string };

async function fetchPageHtmlOnce(url: string): Promise<FetchPageResult> {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    origin = url;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja-JP,ja;q=0.9",
        Referer: origin,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    return { ok: true, html: await response.text(), status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: message };
  }
}

async function fetchPageHtml(url: string): Promise<FetchPageResult> {
  const first = await fetchPageHtmlOnce(url);
  if (first.ok) return first;

  if (isRetryableFetchError(first.status, first.reason)) {
    console.log(`  リトライ待機中 (2秒): ${first.reason}`);
    await delay(2000);
    return fetchPageHtmlOnce(url);
  }

  return first;
}

type EarphoneRow = {
  id: string;
  name: string;
  url: string;
  image_url: string | null;
};

type FailureRecord = {
  name: string;
  url: string;
  reason: string;
};

function formatExtractionFailureReason(result: ImageExtractionResult): string {
  return [
    "画像URLを抽出できませんでした",
    `og:image=${result.hasOgImage ? "あり" : "なし"}`,
    `twitter:image=${result.hasTwitterImage ? "あり" : "なし"}`,
    `<img>候補=${result.imgCandidateCount}件`,
  ].join(", ");
}

function getServiceRoleKey(): string | undefined {
  const candidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY,
  ];

  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }

  return undefined;
}

async function main(): Promise<void> {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "エラー: NEXT_PUBLIC_SUPABASE_URL と service role キーが必要です。",
    );
    console.error(
      ".env.local に SUPABASE_SERVICE_ROLE_KEY を追加してください。",
    );
    console.error(
      "（NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY でも動作しますが、",
    );
    console.error(
      "  service role キーは NEXT_PUBLIC_ 付きにしないことを推奨します）",
    );
    if (!supabaseUrl) {
      console.error("  → NEXT_PUBLIC_SUPABASE_URL が未設定です");
    }
    if (!serviceRoleKey) {
      console.error(
        "  → SUPABASE_SERVICE_ROLE_KEY（または NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY）が未設定です",
      );
    }
    process.exit(1);
  }

  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() &&
    (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY?.trim())
  ) {
    console.warn(
      "警告: service role キーが NEXT_PUBLIC_ 付きの変数から読み込まれています。",
    );
    console.warn(
      "  ブラウザに公開されないよう、SUPABASE_SERVICE_ROLE_KEY への移行を推奨します。\n",
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from("earphones")
    .select("id, name, url")
    .or("image_url.is.null,image_url.eq.")
    .not("url", "is", null)
    .neq("url", "");

  if (error) {
    console.error("Supabase取得エラー:", error.message);
    process.exit(1);
  }

  const earphones = ((data ?? []) as EarphoneRow[]).filter(
    (row: EarphoneRow): row is EarphoneRow => Boolean(row.url?.trim()),
  );
  const total = earphones.length;

  if (total === 0) {
    console.log("更新対象の商品はありません。");
    return;
  }

  console.log(`${total}件の商品画像を取得します...\n`);

  let successCount = 0;
  let failureCount = 0;
  const failures: FailureRecord[] = [];

  for (let index = 0; index < earphones.length; index++) {
    const earphone = earphones[index];
    const pageUrl = earphone.url!.trim();

    const fetchResult = await fetchPageHtml(pageUrl);

    if (!fetchResult.ok) {
      const reason =
        fetchResult.status !== undefined
          ? `${fetchResult.reason} (status=${fetchResult.status})`
          : fetchResult.reason;
      console.log(`取得失敗: ${earphone.name}`);
      console.log(`  理由: ${reason}`);
      failures.push({ name: earphone.name, url: pageUrl, reason });
      failureCount++;
    } else {
      const extraction = extractImageUrl(fetchResult.html, pageUrl);

      if (!extraction.imageUrl) {
        const reason = formatExtractionFailureReason(extraction);
        console.log(`取得失敗: ${earphone.name}`);
        console.log(`  HTTP status: ${fetchResult.status}`);
        console.log(`  理由: ${reason}`);
        failures.push({ name: earphone.name, url: pageUrl, reason });
        failureCount++;
      } else {
        const updatePayload: Pick<EarphoneRow, "image_url"> = {
          image_url: extraction.imageUrl,
        };
        const { error: updateError } = await supabase
          .from("earphones")
          .update(updatePayload as never)
          .eq("id", earphone.id);

        if (updateError) {
          const reason = `Supabase更新失敗: ${updateError.message}`;
          console.log(`取得失敗: ${earphone.name}`);
          console.log(`  理由: ${reason}`);
          failures.push({ name: earphone.name, url: pageUrl, reason });
          failureCount++;
        } else {
          console.log(
            `成功: ${earphone.name} (source=${extraction.source}, status=${fetchResult.status})`,
          );
          successCount++;
        }
      }
    }

    if (index < earphones.length - 1) {
      await randomDelay();
    }
  }

  console.log(`\n${total}件中 ${successCount}件成功、${failureCount}件失敗`);

  if (failures.length > 0) {
    console.log("\n--- 失敗一覧 ---");
    for (const failure of failures) {
      console.log(`商品名: ${failure.name}`);
      console.log(`URL: ${failure.url}`);
      console.log(`失敗理由: ${failure.reason}`);
      console.log("");
    }
  }
}

main().catch((err) => {
  console.error("予期しないエラー:", err);
  process.exit(1);
});
