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

function extractImageUrl(html: string, pageUrl: string): string | null {
  const $ = cheerio.load(html);

  const ogImage =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[property="og:image:url"]').attr("content");
  if (ogImage) return resolveAbsoluteUrl(pageUrl, ogImage);

  const twitterImage =
    $('meta[name="twitter:image"]').attr("content") ??
    $('meta[name="twitter:image:src"]').attr("content");
  if (twitterImage) return resolveAbsoluteUrl(pageUrl, twitterImage);

  let bestImage: string | null = null;
  let bestSize = 0;

  $("img").each((_, element) => {
    const src =
      $(element).attr("src") ??
      $(element).attr("data-src") ??
      $(element).attr("data-lazy-src");
    if (!src || src.startsWith("data:")) return;

    const width = parseDimension($(element).attr("width"));
    const height = parseDimension($(element).attr("height"));
    const size = Math.max(width, height);

    if (size >= 300 && size > bestSize) {
      bestSize = size;
      bestImage = src;
    }
  });

  if (bestImage) return resolveAbsoluteUrl(pageUrl, bestImage);

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function randomDelay(): Promise<void> {
  const ms = 1000 + Math.random() * 1000;
  return delay(ms);
}

async function fetchPageHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; EarphoneCompare/1.0; +https://earphone-compare.local)",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

type EarphoneRow = Pick<
  Database["public"]["Tables"]["earphones"]["Row"],
  "id" | "name" | "url"
>;

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

  const earphones = (data ?? []).filter(
    (row): row is EarphoneRow => Boolean(row.url?.trim()),
  );
  const total = earphones.length;

  if (total === 0) {
    console.log("更新対象の商品はありません。");
    return;
  }

  console.log(`${total}件の商品画像を取得します...\n`);

  let successCount = 0;
  let failureCount = 0;

  for (let index = 0; index < earphones.length; index++) {
    const earphone = earphones[index];
    const pageUrl = earphone.url!.trim();

    try {
      const html = await fetchPageHtml(pageUrl);
      const imageUrl = extractImageUrl(html, pageUrl);

      if (!imageUrl) {
        console.log(`取得失敗: ${earphone.name}`);
        failureCount++;
      } else {
        const { error: updateError } = await supabase
          .from("earphones")
          .update({ image_url: imageUrl })
          .eq("id", earphone.id);

        if (updateError) {
          console.log(`取得失敗: ${earphone.name} (${updateError.message})`);
          failureCount++;
        } else {
          console.log(`成功: ${earphone.name}`);
          successCount++;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`取得失敗: ${earphone.name} (${message})`);
      failureCount++;
    }

    if (index < earphones.length - 1) {
      await randomDelay();
    }
  }

  console.log(`\n${total}件中 ${successCount}件成功、${failureCount}件失敗`);
}

main().catch((err) => {
  console.error("予期しないエラー:", err);
  process.exit(1);
});
