// 2,000〜4,000円帯のイヤホン候補を、楽天/Yahoo!商品検索APIから抽出してCSV出力する。
// DB書き込み・earphones.json の更新は一切行わない（読み取りのみ）。
//
// ---------------------------------------------------------------------------
// 実行方法
// ---------------------------------------------------------------------------
//   node scripts/extract-price-band-candidates.mjs
//   npm run extract-candidates          # package.json に下記を追加する場合
//
//   # 標準出力へ出す場合
//   OUT=- node scripts/extract-price-band-candidates.mjs
//
//   # 出力先ファイルを指定
//   OUT=tmp/candidates-2k4k.csv node scripts/extract-price-band-candidates.mjs
//
//   # 片方のモールだけ
//   SOURCE=rakuten node scripts/extract-price-band-candidates.mjs
//   SOURCE=yahoo node scripts/extract-price-band-candidates.mjs
//
// package.json への追加案（既存ファイルは未変更のため手動追加）:
//   "extract-candidates": "node scripts/extract-price-band-candidates.mjs"
//
// ---------------------------------------------------------------------------
// 必要な環境変数（.env.local から自動読込）
// ---------------------------------------------------------------------------
// 楽天 (SOURCE=rakuten|both のとき):
//   RAKUTEN_APP_ID        楽天ウェブサービスのアプリID
//   RAKUTEN_ACCESS_KEY    アクセスキー
//   RAKUTEN_AFFILIATE_ID  アフィリエイトID（URL取得用）
//   RAKUTEN_ORIGIN        （任意）許可ドメイン。Web application 登録時は Origin/Referer 用
//
// Yahoo! (SOURCE=yahoo|both のとき):
//   YAHOO_APP_ID          Yahoo! Client ID（未設定時は YAHOO_CLIENT_ID）
//   VC_SID                バリューコマース sid
//   VC_PID                バリューコマース pid
//
// 任意:
//   MIN_PRICE             下限価格（既定: 2000）
//   MAX_PRICE             上限価格（既定: 4000）
//   OUT                   出力先（既定: candidates.csv / "-" で標準出力）
//   SOURCE                both | rakuten | yahoo（既定: both）
//   HITS                  1キーワードあたりの取得件数（既定: 30、楽天は最大30）
//   DEBUG                 "true" でAPI詳細ログ
//
// 既存カタログ除外:
//   src/data/earphones.json を読み、brand+name（正規化一致）で除外する。

import { existsSync, readFileSync, writeFileSync } from "fs";
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

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID?.trim();
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY?.trim();
const RAKUTEN_AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID?.trim();
const RAKUTEN_ORIGIN = process.env.RAKUTEN_ORIGIN?.trim();
const YAHOO_APP_ID =
  process.env.YAHOO_APP_ID?.trim() || process.env.YAHOO_CLIENT_ID?.trim();
const VC_SID = process.env.VC_SID?.trim();
const VC_PID = process.env.VC_PID?.trim();

const MIN_PRICE = Number.parseInt(process.env.MIN_PRICE ?? "2000", 10);
const MAX_PRICE = Number.parseInt(process.env.MAX_PRICE ?? "4000", 10);
const HITS = Math.min(
  30,
  Math.max(1, Number.parseInt(process.env.HITS ?? "30", 10) || 30),
);
const SOURCE = (process.env.SOURCE ?? "both").toLowerCase();
const DEBUG = process.env.DEBUG === "true";
const OUT = process.env.OUT?.trim() || "candidates.csv";

const SEARCH_KEYWORDS = [
  "有線イヤホン",
  "ワイヤレスイヤホン",
  "完全ワイヤレス",
  "Bluetooth イヤホン 有線",
  "Bluetooth イヤホン",
  "カナル型 イヤホン",
  "ネックバンド イヤホン",
];

// sync-rakuten-links.mjs / sync-yahoo-links.mjs と同じ除外リストを再利用
// 裸の「ケース」は本体商品まで落とすため使わない。
const EXCLUDE_KEYWORDS = [
  "シリコンケース",
  "保護ケース",
  "用ケース",
  "イヤホンケース",
  "ソフトケース",
  "ハードケース",
  "クリアケース",
  "ケースカバー",
  "ケースのみ",
  "充電ケースのみ",
  "ケース単体",
  "カバー",
  "ポーチ",
  "カラビナ",
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
  "落下防止",
];

const COLOR_WORDS = [
  "ブラック",
  "ホワイト",
  "シルバー",
  "ゴールド",
  "レッド",
  "ブルー",
  "グリーン",
  "ピンク",
  "パープル",
  "イエロー",
  "オレンジ",
  "グレー",
  "グレイ",
  "ベージュ",
  "ブラウン",
  "ネイビー",
  "ターコイズ",
  "ラベンダー",
  "クリーム",
  "黒",
  "白",
  "赤",
  "青",
  "緑",
  "紫",
  "黄",
  "茶",
  "灰",
  "金",
  "銀",
  "black",
  "white",
  "silver",
  "gold",
  "red",
  "blue",
  "green",
  "pink",
  "purple",
  "yellow",
  "orange",
  "gray",
  "grey",
  "navy",
  "beige",
  "brown",
];

const NOISE_PHRASES = [
  "送料無料",
  "即納",
  "あす楽",
  "当日発送",
  "正規品",
  "純正",
  "新品",
  "公式",
  "国内正規",
  "メーカー保証",
  "ラッピング対応",
  "ギフト",
  "限定色",
  "限定カラー",
  "数量限定",
  "在庫あり",
  "おすすめ",
  "人気",
  "セール",
  "特価",
  "最安",
  "値下げ",
];

const EXTRA_BRANDS = [
  "Soundcore",
  "Nothing",
  "CMF",
  "Baseus",
  "QCY",
  "Edifier",
  "TOZO",
  "EarFun",
  "SoundPEATS",
  "1MORE",
  "Moondrop",
  "Final",
  "final",
  "Audio-Technica",
  "audio-technica",
  "Technics",
  "Panasonic",
  "Xiaomi",
  "Redmi",
  "Huawei",
  "Oppo",
  "realme",
  "Anker",
  "Apple",
  "Beats",
  "Bose",
  "Google",
  "Jabra",
  "JBL",
  "Philips",
  "Sennheiser",
  "Shure",
  "Sony",
  "Skullcandy",
  "Marshall",
  "Bang & Olufsen",
  "B&O",
  "AKG",
  "Pioneer",
  "Denon",
  "Yamaha",
  "AG",
  "radius",
  "NUARL",
  "Victor",
  "Elecom",
  "ELECOM",
  "Logicoool",
  "Logitech",
  "Aukey",
  "AUKEY",
  "Tranya",
  "Haylou",
  "Amazfit",
];

const RAKUTEN_ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";
const YAHOO_ENDPOINT =
  "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch";
const RAKUTEN_INTERVAL_MS = 1100;
const YAHOO_INTERVAL_MS = 2000;

const CSV_HEADERS = [
  "ブランド",
  "商品名",
  "価格",
  "レビュー件数",
  "評価",
  "楽天URL",
  "Yahoo!URL",
  "推定カテゴリ",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalize(str) {
  return String(str ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_()（）/／,、。.．·・+＋'’"“”【】\[\]{}]/g, "");
}

function escapeCsv(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(cols) {
  return cols.map(escapeCsv).join(",");
}

function requireEnv(pairs) {
  for (const [key, value] of pairs) {
    if (!value) {
      console.error(`環境変数 ${key} が設定されていません`);
      process.exit(1);
    }
  }
}

function loadExistingCatalog() {
  const path = resolve(process.cwd(), "src/data/earphones.json");
  if (!existsSync(path)) {
    console.error(`既存カタログが見つかりません: ${path}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(path, "utf-8"));
  const earphones = data.earphones ?? data;
  const keys = new Set();
  const brands = new Set();

  for (const ep of earphones) {
    const brand = String(ep.brand ?? "").trim();
    const name = String(ep.name ?? "").trim();
    if (!brand || !name) continue;
    keys.add(`${normalize(brand)}|${normalize(name)}`);
    brands.add(brand);
  }
  return { keys, brands: [...brands] };
}

function buildBrandList(existingBrands) {
  const merged = [...existingBrands, ...EXTRA_BRANDS];
  const uniq = new Map();
  for (const b of merged) {
    const n = normalize(b);
    if (!n) continue;
    if (!uniq.has(n) || b.length > uniq.get(n).length) uniq.set(n, b);
  }
  return [...uniq.values()].sort((a, b) => b.length - a.length);
}

function isExcludedAccessory(itemName) {
  return EXCLUDE_KEYWORDS.some((kw) => itemName.includes(kw));
}

function estimateCategory(itemName) {
  const n = normalize(itemName);
  const twsHints = [
    "完全ワイヤレス",
    "トゥルーワイヤレス",
    "truewireless",
    "tws",
    "ワイヤレスイヤホン",
    "bluetoothイヤホン",
    "bluetooth対応",
    "充電ケース",
  ];
  const wiredHints = [
    "有線イヤホン",
    "有線接続",
    "3.5mm",
    "ステレオミニ",
    "マイク付き有線",
  ];

  const looksTws = twsHints.some((h) => n.includes(normalize(h)));
  const looksWired =
    wiredHints.some((h) => n.includes(normalize(h))) ||
    (n.includes("有線") && !n.includes("無線") && !looksTws);

  // 「Bluetooth イヤホン 有線」系はネックバンド等で両方が付くことがある
  if (looksTws && looksWired) {
    if (n.includes("完全ワイヤレス") || n.includes("tws")) return "完全ワイヤレス";
    if (n.includes("有線") && !n.includes("ワイヤレス")) return "有線";
    return "不明";
  }
  if (looksTws) return "完全ワイヤレス";
  if (looksWired) return "有線";
  return "不明";
}

function stripNoise(title) {
  let t = title.normalize("NFKC");
  for (const phrase of NOISE_PHRASES) {
    t = t.replaceAll(phrase, " ");
  }
  for (const color of COLOR_WORDS) {
    const re = new RegExp(
      `(^|[\\s\\/|｜【\\[（(])${color}(色|カラー)?(?=$|[\\s\\/|｜】\\]）),.])`,
      "gi",
    );
    t = t.replace(re, "$1 ");
  }
  return t.replace(/\s+/g, " ").trim();
}

function extractBrandAndName(itemName, brandList) {
  const cleaned = stripNoise(itemName);
  const normCleaned = normalize(cleaned);

  let brand = "";
  for (const candidate of brandList) {
    const nc = normalize(candidate);
    if (nc && normCleaned.includes(nc)) {
      brand = candidate;
      break;
    }
  }

  let name = cleaned;
  if (brand) {
    const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    name = cleaned.replace(re, " ").replace(/\s+/g, " ").trim();
  }

  // 先頭の記号・店舗修飾を落とす
  name = name
    .replace(/^[\s|｜/／\-–—:：]+/, "")
    .replace(/\s*[|｜].*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!name) name = cleaned;

  // 長すぎるタイトルは先頭寄りを代表名に
  if (name.length > 80) {
    name = name.slice(0, 80).replace(/\s+\S*$/, "").trim() || name.slice(0, 80);
  }

  if (!brand) {
    const token = cleaned.split(/\s+/)[0] ?? "";
    brand = token.length >= 2 ? token : "不明";
  }

  return { brand, name, dedupeKey: `${normalize(brand)}|${normalize(name)}` };
}

function isInExistingCatalog(dedupeKey, existingKeys, brand, name) {
  if (existingKeys.has(dedupeKey)) return true;

  // 既存 brand+name が商品タイトル側の正規化名に含まれる場合も除外
  const normBrand = normalize(brand);
  const normName = normalize(name);
  for (const key of existingKeys) {
    const [eb, en] = key.split("|");
    if (!eb || !en) continue;
    if (normBrand === eb && (normName.includes(en) || en.includes(normName))) {
      return true;
    }
  }
  return false;
}

async function searchRakuten(keyword) {
  const url = new URL(RAKUTEN_ENDPOINT);
  url.searchParams.set("applicationId", RAKUTEN_APP_ID);
  url.searchParams.set("accessKey", RAKUTEN_ACCESS_KEY);
  url.searchParams.set("affiliateId", RAKUTEN_AFFILIATE_ID);
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("hits", String(HITS));
  url.searchParams.set("sort", "-reviewCount");
  url.searchParams.set("minPrice", String(MIN_PRICE));
  url.searchParams.set("maxPrice", String(MAX_PRICE));
  url.searchParams.set("formatVersion", "2");

  const headers = {};
  if (RAKUTEN_ORIGIN) {
    headers.Origin = RAKUTEN_ORIGIN;
    headers.Referer = `${RAKUTEN_ORIGIN}/`;
  }

  if (DEBUG) {
    console.error(`[DEBUG] Rakuten keyword="${keyword}"`);
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Rakuten API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.Items ?? [];
}

function buildYahooSearchUrl(keyword) {
  const affiliateId = encodeURIComponent(
    `http://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${VC_SID}&pid=${VC_PID}&vc_url=`,
  );
  return (
    `${YAHOO_ENDPOINT}?` +
    [
      `appid=${encodeURIComponent(YAHOO_APP_ID)}`,
      "affiliate_type=vc",
      `affiliate_id=${affiliateId}`,
      `query=${encodeURIComponent(keyword)}`,
      `results=${HITS}`,
      "sort=-review_count",
      "condition=new",
      `price_from=${MIN_PRICE}`,
      `price_to=${MAX_PRICE}`,
    ].join("&")
  );
}

async function searchYahoo(keyword) {
  const url = buildYahooSearchUrl(keyword);
  if (DEBUG) {
    console.error(`[DEBUG] Yahoo keyword="${keyword}"`);
  }
  const res = await fetch(url);
  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Yahoo Shopping API error: ${res.status} ${bodyText}`);
  }
  const data = JSON.parse(bodyText);
  return data.hits ?? [];
}

function mapRakutenItem(item, brandList) {
  const itemName = item.itemName ?? "";
  if (!itemName || isExcludedAccessory(itemName)) return null;

  const price = item.itemPrice ?? null;
  if (price == null || price < MIN_PRICE || price > MAX_PRICE) return null;

  const { brand, name, dedupeKey } = extractBrandAndName(itemName, brandList);
  return {
    brand,
    name,
    rawTitle: itemName,
    price,
    reviewCount: item.reviewCount ?? 0,
    rating: item.reviewAverage ?? "",
    rakutenUrl: item.affiliateUrl || item.itemUrl || "",
    yahooUrl: "",
    category: estimateCategory(itemName),
    dedupeKey,
    source: "rakuten",
  };
}

function mapYahooHit(hit, brandList) {
  const itemName = hit.name ?? "";
  if (!itemName || isExcludedAccessory(itemName)) return null;

  const price = hit.price ?? null;
  if (price == null || price < MIN_PRICE || price > MAX_PRICE) return null;

  // API に brand があれば優先
  const apiBrand =
    (typeof hit.brand === "string" && hit.brand) ||
    hit.brand?.name ||
    hit.brandName ||
    "";
  const brandListWithApi = apiBrand
    ? [apiBrand, ...brandList]
    : brandList;

  const { brand, name, dedupeKey } = extractBrandAndName(
    itemName,
    brandListWithApi,
  );

  return {
    brand: apiBrand || brand,
    name,
    rawTitle: itemName,
    price,
    reviewCount: hit.review?.count ?? 0,
    rating: hit.review?.rate ?? "",
    rakutenUrl: "",
    yahooUrl: hit.url ?? "",
    category: estimateCategory(itemName),
    dedupeKey,
    source: "yahoo",
  };
}

function mergeCandidates(list) {
  const byKey = new Map();

  for (const c of list) {
    const prev = byKey.get(c.dedupeKey);
    if (!prev) {
      byKey.set(c.dedupeKey, { ...c });
      continue;
    }

    // レビュー件数が多い方を代表にしつつ URL を統合
    const winner =
      (c.reviewCount ?? 0) > (prev.reviewCount ?? 0) ? c : prev;
    const loser = winner === c ? prev : c;

    byKey.set(c.dedupeKey, {
      ...winner,
      rakutenUrl: winner.rakutenUrl || loser.rakutenUrl,
      yahooUrl: winner.yahooUrl || loser.yahooUrl,
      rating: winner.rating !== "" && winner.rating != null
        ? winner.rating
        : loser.rating,
      category:
        winner.category !== "不明" ? winner.category : loser.category,
    });
  }

  return [...byKey.values()].sort(
    (a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
  );
}

async function collectFromRakuten(brandList) {
  const rows = [];
  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const items = await searchRakuten(keyword);
      for (const item of items) {
        const mapped = mapRakutenItem(item, brandList);
        if (mapped) rows.push(mapped);
      }
      console.error(
        `[楽天] "${keyword}" → ${items.length}件取得 / 採用累計 ${rows.length}`,
      );
    } catch (err) {
      console.error(`[楽天] "${keyword}" 失敗: ${err.message}`);
    }
    await sleep(RAKUTEN_INTERVAL_MS);
  }
  return rows;
}

async function collectFromYahoo(brandList) {
  const rows = [];
  for (const keyword of SEARCH_KEYWORDS) {
    try {
      const hits = await searchYahoo(keyword);
      for (const hit of hits) {
        const mapped = mapYahooHit(hit, brandList);
        if (mapped) rows.push(mapped);
      }
      console.error(
        `[Yahoo!] "${keyword}" → ${hits.length}件取得 / 採用累計 ${rows.length}`,
      );
    } catch (err) {
      console.error(`[Yahoo!] "${keyword}" 失敗: ${err.message}`);
    }
    await sleep(YAHOO_INTERVAL_MS);
  }
  return rows;
}

async function main() {
  if (!Number.isFinite(MIN_PRICE) || !Number.isFinite(MAX_PRICE)) {
    console.error("MIN_PRICE / MAX_PRICE は整数で指定してください");
    process.exit(1);
  }
  if (MIN_PRICE >= MAX_PRICE) {
    console.error("MIN_PRICE は MAX_PRICE より小さくしてください");
    process.exit(1);
  }

  const useRakuten = SOURCE === "both" || SOURCE === "rakuten";
  const useYahoo = SOURCE === "both" || SOURCE === "yahoo";
  if (!useRakuten && !useYahoo) {
    console.error('SOURCE は both | rakuten | yahoo のいずれかを指定してください');
    process.exit(1);
  }

  if (useRakuten) {
    requireEnv([
      ["RAKUTEN_APP_ID", RAKUTEN_APP_ID],
      ["RAKUTEN_ACCESS_KEY", RAKUTEN_ACCESS_KEY],
      ["RAKUTEN_AFFILIATE_ID", RAKUTEN_AFFILIATE_ID],
    ]);
  }
  if (useYahoo) {
    requireEnv([
      ["YAHOO_APP_ID", YAHOO_APP_ID],
      ["VC_SID", VC_SID],
      ["VC_PID", VC_PID],
    ]);
  }

  const { keys: existingKeys, brands: existingBrands } = loadExistingCatalog();
  const brandList = buildBrandList(existingBrands);

  console.error(
    `価格帯: ¥${MIN_PRICE}〜¥${MAX_PRICE} / SOURCE=${SOURCE} / 既存カタログ ${existingKeys.size}機種`,
  );
  console.error(`検索キーワード: ${SEARCH_KEYWORDS.join(" / ")}`);

  const collected = [];
  if (useRakuten) {
    collected.push(...(await collectFromRakuten(brandList)));
  }
  if (useYahoo) {
    collected.push(...(await collectFromYahoo(brandList)));
  }

  const filtered = collected.filter(
    (c) => !isInExistingCatalog(c.dedupeKey, existingKeys, c.brand, c.name),
  );
  const merged = mergeCandidates(filtered);

  const lines = [
    toCsvRow(CSV_HEADERS),
    ...merged.map((c) =>
      toCsvRow([
        c.brand,
        c.name,
        c.price,
        c.reviewCount,
        c.rating,
        c.rakutenUrl,
        c.yahooUrl,
        c.category,
      ]),
    ),
  ];
  const csv = `${lines.join("\n")}\n`;

  if (OUT === "-") {
    process.stdout.write(csv);
  } else {
    const outPath = resolve(process.cwd(), OUT);
    writeFileSync(outPath, csv, "utf-8");
    console.error(
      `CSV出力: ${outPath}（${merged.length}件 / 生データ ${collected.length}件 → 既存除外後 ${filtered.length}件 → 重複統合 ${merged.length}件）`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
