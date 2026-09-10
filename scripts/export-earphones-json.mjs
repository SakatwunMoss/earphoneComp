// earphones テーブル全件を src/data/earphones.json に静的出力する。
// Yahoo / 楽天同期バッチの後に実行し、Vercel ビルド用のソースにする。
//
// 実行方法:
//   node scripts/export-earphones-json.mjs
//
// 環境変数:
//   SUPABASE_URL               Supabaseプロジェクトの URL
//                              （未設定時は NEXT_PUBLIC_SUPABASE_URL を利用）
//   SUPABASE_SERVICE_ROLE_KEY  全件取得用（未設定時は NEXT_PUBLIC_SUPABASE_ANON_KEY）

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

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
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const OUTPUT_PATH = resolve(process.cwd(), "src/data/earphones.json");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "環境変数 SUPABASE_URL（または NEXT_PUBLIC_SUPABASE_URL）と、" +
      "SUPABASE_SERVICE_ROLE_KEY（または NEXT_PUBLIC_SUPABASE_ANON_KEY）が必要です",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PAGE_SIZE = 1000;

async function fetchAllEarphones() {
  const rows = [];
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("earphones")
      .select("*")
      .order("brand", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Supabase fetch failed: ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return rows;
}

async function main() {
  console.log("Exporting earphones →", OUTPUT_PATH);
  const earphones = await fetchAllEarphones();
  const payload = {
    generated_at: new Date().toISOString(),
    count: earphones.length,
    earphones,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${earphones.length} earphones (generated_at=${payload.generated_at})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
