/**
 * Seed earphones.long_description from scripts/data/long-descriptions.json
 *
 * Usage:
 *   node scripts/seed-long-descriptions.mjs
 *   DRY_RUN=true node scripts/seed-long-descriptions.mjs
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.env.DRY_RUN === "true";

function loadEnvLocal() {
  const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

const env = loadEnvLocal();
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("SUPABASE_URL / SERVICE_ROLE_KEY required");
  process.exit(1);
}

const descriptions = JSON.parse(
  readFileSync(join(__dirname, "data", "long-descriptions.json"), "utf8"),
);

const supabase = createClient(url, key);

const { data: rows, error } = await supabase
  .from("earphones")
  .select("id, brand, name")
  .order("brand")
  .order("name");

if (error) {
  console.error("FETCH_ERROR", error.message);
  process.exit(1);
}

let updated = 0;
let missing = 0;
const unmatchedKeys = new Set(Object.keys(descriptions));

for (const row of rows) {
  const keyName = `${row.brand}|${row.name}`;
  const text = descriptions[keyName];
  if (!text) {
    console.warn("NO_TEXT", keyName);
    missing++;
    continue;
  }
  unmatchedKeys.delete(keyName);
  const len = [...text].length;
  if (len < 300 || len > 500) {
    console.warn("LENGTH_OUT_OF_RANGE", keyName, len);
  }
  if (dryRun) {
    console.log("DRY", keyName, len);
    updated++;
    continue;
  }
  const { error: updateError } = await supabase
    .from("earphones")
    .update({ long_description: text })
    .eq("id", row.id);
  if (updateError) {
    console.error("UPDATE_ERROR", keyName, updateError.message);
    continue;
  }
  updated++;
}

for (const unused of unmatchedKeys) {
  console.warn("UNUSED_KEY", unused);
}

const { count: filled } = await supabase
  .from("earphones")
  .select("id", { count: "exact", head: true })
  .not("long_description", "is", null)
  .neq("long_description", "");

console.log(
  JSON.stringify({
    dryRun,
    rows: rows.length,
    updated,
    missing,
    unusedKeys: unmatchedKeys.size,
    filled,
  }),
);
