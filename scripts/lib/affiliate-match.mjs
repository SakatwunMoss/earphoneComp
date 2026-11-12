// 楽天 / Yahoo! アフィリエイト同期の共通マッチング・レポートロジック

/** @typedef {{ id?: string, brand: string, name: string, price?: number|null }} EarphoneLike */

export const DEFAULT_PRICE_RATIO_MIN = 0.6;
export const DEFAULT_PRICE_RATIO_MAX = 1.6;
export const DEFAULT_LOW_PRICE_THRESHOLD = 5000;
export const DEFAULT_LOW_PRICE_RATIO_MIN = 0.7;
export const DEFAULT_LOW_PRICE_RATIO_MAX = 1.4;
/** price 列が古い疑い: 両店舗が同じ方向にこの倍率超でずれている */
export const PRICE_STALE_SAME_DIRECTION_RATIO = 1.5;

export function getPriceGuardConfig(env = process.env) {
  const ratioMin = numEnv(env.PRICE_RATIO_MIN, DEFAULT_PRICE_RATIO_MIN);
  const ratioMax = numEnv(env.PRICE_RATIO_MAX, DEFAULT_PRICE_RATIO_MAX);
  const lowThreshold = numEnv(
    env.LOW_PRICE_THRESHOLD,
    DEFAULT_LOW_PRICE_THRESHOLD,
  );
  const lowMin = numEnv(env.LOW_PRICE_RATIO_MIN, DEFAULT_LOW_PRICE_RATIO_MIN);
  const lowMax = numEnv(env.LOW_PRICE_RATIO_MAX, DEFAULT_LOW_PRICE_RATIO_MAX);
  return { ratioMin, ratioMax, lowThreshold, lowMin, lowMax };
}

function numEnv(value, fallback) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** 型番・機種名を比較しやすいよう正規化 */
export function normalize(str) {
  return String(str ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_()（）/／,、。.．']/g, "");
}

/** 「AirPods 5(ワイヤレス充電ケース付き)」→ baseName / variant に分割 */
export function parseModelName(name) {
  const m = String(name).match(/^(.+?)\s*[（(]([^）)]+)[）)]\s*$/);
  if (!m) return { baseName: name, variant: null };
  return { baseName: m[1].trim(), variant: m[2].trim() };
}

export function variantNeedles(variant) {
  const needles = [variant];
  const stripped = variant.replace(/(付き|搭載|モデル|版)$/u, "");
  if (stripped && stripped !== variant) needles.push(stripped);

  const norm = normalize(variant);
  if (norm.includes("anc")) {
    needles.push(
      "ANC",
      "アクティブノイズキャンセリング",
      "ノイズキャンセリング",
      "ノイキャン",
    );
  }
  return [...new Set(needles)];
}

export function itemMatchesVariant(itemName, variant) {
  const normItem = normalize(itemName);
  return variantNeedles(variant).some((needle) =>
    normItem.includes(normalize(needle)),
  );
}

export function buildVariantIndex(earphones) {
  const index = new Map();
  for (const earphone of earphones) {
    const { baseName, variant } = parseModelName(earphone.name);
    const key = normalize(baseName);
    if (!index.has(key)) index.set(key, []);
    if (variant) index.get(key).push(variant);
  }
  return index;
}

/**
 * 同一ブランド内で、より長い登録名（フル名・ベース名）の一覧を各機種に紐づける。
 * 候補タイトルに長い名前が含まれる場合は短い側へ割り当てない。
 */
export function buildLongerNameIndex(earphones) {
  /** @type {Map<string, string[]>} */
  const index = new Map();

  for (const earphone of earphones) {
    const key = earphoneKey(earphone);
    const myBase = normalize(parseModelName(earphone.name).baseName);
    const myFull = normalize(earphone.name);
    const longer = [];

    for (const other of earphones) {
      if (other.brand !== earphone.brand) continue;
      if (earphoneKey(other) === key) continue;

      const otherBase = normalize(parseModelName(other.name).baseName);
      const otherFull = normalize(other.name);

      const isLonger =
        otherBase.length > myBase.length || otherFull.length > myFull.length;
      if (!isLonger) continue;

      // 短い側のベースを含む／拡張している長い名前だけ対象
      // （例: Elite 4 → Elite 4 Active、QuietComfort Earbuds → QuietComfort Ultra Earbuds）
      const related =
        otherBase.includes(myBase) ||
        otherFull.includes(myBase) ||
        (myBase.length >= 4 &&
          otherBase.length > myBase.length &&
          shareModelFamily(myBase, otherBase));

      if (related) {
        longer.push(other.name);
        if (parseModelName(other.name).baseName !== other.name) {
          longer.push(parseModelName(other.name).baseName);
        }
      }
    }

    index.set(key, [...new Set(longer)]);
  }

  return index;
}

function shareModelFamily(shorterNorm, longerNorm) {
  // QuietComfort Earbuds vs QuietComfort Ultra Earbuds:
  // 共通プレフィックスが十分長く、短い側の主要トークンが長い側に散在する
  let i = 0;
  while (
    i < shorterNorm.length &&
    i < longerNorm.length &&
    shorterNorm[i] === longerNorm[i]
  ) {
    i++;
  }
  if (i >= 8) return true;

  // Pixel Buds Pro vs Pixel Buds Pro 2
  if (longerNorm.startsWith(shorterNorm)) return true;

  return false;
}

function earphoneKey(earphone) {
  return earphone.id != null
    ? String(earphone.id)
    : `${earphone.brand}|${earphone.name}`;
}

export function buildSearchKeyword(brand, name) {
  return `${brand} ${name}`
    .replace(/\s+(\d)\b/g, "$1")
    .replace(/\s+\+/g, "+")
    .replace(/\s+/g, " ")
    .trim();
}

/** 括弧とその中身を除去した名前（フォールバック検索用） */
export function stripParentheticals(name) {
  return String(name ?? "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 検索キーワード候補を順に返す。
 * (a) ブランド+名前 (b) 名前のみ (c) 括弧除去名 (d) aliases["brand|name"]
 */
export function buildSearchKeywordList(brand, name, aliases = {}) {
  const key = `${brand}|${name}`;
  const aliasList = Array.isArray(aliases[key]) ? aliases[key] : [];
  const candidates = [
    buildSearchKeyword(brand, name),
    String(name ?? "").trim(),
    stripParentheticals(name),
    ...aliasList.map((a) => String(a ?? "").trim()),
  ];
  const seen = new Set();
  const out = [];
  for (const kw of candidates) {
    if (!kw || seen.has(kw)) continue;
    seen.add(kw);
    out.push(kw);
  }
  return out;
}

/**
 * 0件のとき次キーワードへ。最初にヒットしたキーワードで打ち切る。
 * @param {(keyword: string) => Promise<any[]>} searchFn
 * @param {string[]} keywords
 * @param {{ sleep?: (ms: number) => Promise<void>, intervalMs?: number }} [opts]
 */
export async function searchWithKeywordFallback(
  searchFn,
  keywords,
  { sleep = null, intervalMs = 0 } = {},
) {
  /** @type {Array<{ keyword: string, hitCount: number, error?: string }>} */
  const attempts = [];
  let items = [];
  let keywordUsed = keywords[0] ?? "";
  let hitCount = 0;

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];
    if (i > 0 && sleep && intervalMs > 0) {
      await sleep(intervalMs);
    }
    try {
      items = (await searchFn(keyword)) ?? [];
    } catch (err) {
      attempts.push({
        keyword,
        hitCount: 0,
        error: err?.message ?? String(err),
      });
      keywordUsed = keyword;
      hitCount = 0;
      items = [];
      continue;
    }
    const count = items.length;
    attempts.push({ keyword, hitCount: count });
    keywordUsed = keyword;
    hitCount = count;
    if (count > 0) break;
  }

  return { items, keywordUsed, hitCount, attempts };
}

export function formatKeywordHitCounts(attempts) {
  return (attempts ?? [])
    .map((a) =>
      a.error
        ? `${a.keyword}:error`
        : `${a.keyword}:${a.hitCount}`,
    )
    .join(" | ");
}

/** 登録 URL のパス末尾スラッグ（アフィリエイト経由の実URLも解決） */
export function urlPathSlug(url) {
  if (url == null || url === "") return "";
  try {
    const u = new URL(String(url));
    for (const key of ["vc_url", "pc", "m", "url"]) {
      const nested = u.searchParams.get(key);
      if (!nested) continue;
      try {
        const inner = new URL(nested);
        const parts = inner.pathname.split("/").filter(Boolean);
        if (parts.length > 0) return parts[parts.length - 1];
      } catch {
        /* try next */
      }
    }
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  } catch {
    const noQuery = String(url).split("?")[0];
    const parts = noQuery.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
  }
}

/** hold の reason から候補商品名を取り出す */
export function holdCandidateTitle(reason) {
  const s = String(reason ?? "");
  const sep = " | ";
  const i = s.indexOf(sep);
  if (i === -1) return "";
  return s.slice(i + sep.length).trim();
}

/**
 * 登録名から型番トークンを抽出する。
 * 例: WF-1000XM5, E500, TAT1209, SHE9700BT, Elite 4
 */
export function extractModelTokens(name) {
  const { baseName } = parseModelName(name);
  const tokens = new Set();

  // ハイフン付き型番 (WF-1000XM5, WF-C510)
  for (const m of baseName.matchAll(
    /[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+/g,
  )) {
    tokens.add(m[0]);
  }

  // 数字を含む連続英数字型番 (E500, TAT1209, SHE9700BT, AONIC3 相当)
  for (const m of baseName.matchAll(/[A-Za-z]+\d[A-Za-z0-9]*/g)) {
    if (m[0].length >= 2) tokens.add(m[0]);
  }

  // 「語 + 数字」 (Elite 4, AirPods 4, Liberty 4 Pro の Liberty 4 部分など)
  for (const m of baseName.matchAll(
    /[A-Za-z][A-Za-z0-9]*(?:\s+[A-Za-z][A-Za-z0-9]*)*\s+\d+(?:\.\d+)?/g,
  )) {
    tokens.add(m[0].trim());
  }

  // 「AONIC FREE」など数字なしはベース名全体をトークンにする
  if (tokens.size === 0) {
    tokens.add(baseName);
  }

  return [...tokens];
}

/**
 * 正規化文字列上で語を探す。数字のみの語は前後が数字でない位置だけ許可
 * （「Liberty 4」が「Liberty 5」「Bluetooth 5.4」に誤マッチしないようにする）
 */
function indexOfModelWord(normItem, word, from = 0) {
  if (!/^\d+$/.test(word)) {
    return normItem.indexOf(word, from);
  }

  let pos = from;
  while (pos <= normItem.length) {
    const idx = normItem.indexOf(word, pos);
    if (idx === -1) return -1;
    const before = idx > 0 ? normItem[idx - 1] : "";
    const after = normItem[idx + word.length] ?? "";
    if (!/\d/.test(before) && !/\d/.test(after)) return idx;
    pos = idx + 1;
  }
  return -1;
}

/**
 * ベース名が候補に含まれるか。
 * 連続一致に加え、複数語なら語順一致（間に Ultra 等が挟まっても可）を許す。
 */
export function itemContainsBaseName(itemName, baseName) {
  const normItem = normalize(itemName);
  const normBase = normalize(baseName);
  if (normBase && normItem.includes(normBase)) return true;

  const words = String(baseName)
    .normalize("NFKC")
    .split(/\s+/)
    .map((w) => normalize(w))
    .filter(Boolean);
  if (words.length < 2) return false;

  let pos = 0;
  for (const word of words) {
    const idx = indexOfModelWord(normItem, word, pos);
    if (idx === -1) return false;
    pos = idx + word.length;
  }
  return true;
}

export function itemContainsModelTokens(itemName, tokens) {
  return tokens.every((token) => itemContainsBaseName(itemName, token));
}

// 裸の「ケース」は本体商品まで落とすため使わない
export const EXCLUDE_KEYWORDS = [
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
  // 追加: 中古・セット・異カテゴリ
  "中古",
  "ジャンク",
  "訳あり",
  "展示品",
  "2個セット",
  "2点セット",
  "まとめ買い",
  "集音器",
  "スピーカー",
  "MP3",
  "FMトランスミッター",
  "キッズ",
  "子供用",
];

export function getPriceRatioBounds(price, config = getPriceGuardConfig()) {
  if (price != null && price > 0 && price < config.lowThreshold) {
    return { min: config.lowMin, max: config.lowMax };
  }
  return { min: config.ratioMin, max: config.ratioMax };
}

export function isPriceInRange(itemPrice, currentPrice, config = getPriceGuardConfig()) {
  if (currentPrice == null || currentPrice <= 0 || itemPrice == null) {
    return { ok: true, ratio: null };
  }
  const ratio = itemPrice / currentPrice;
  const { min, max } = getPriceRatioBounds(currentPrice, config);
  return { ok: ratio >= min && ratio <= max, ratio, min, max };
}

/**
 * 候補1件を評価し、不採用理由を返す。採用時は reason=null。
 *
 * @param {EarphoneLike} earphone
 * @param {{ itemName: string, itemPrice?: number|null, itemBrand?: string|null }} item
 * @param {{ variantIndex: Map<string, string[]>, longerNameIndex: Map<string, string[]>, config?: ReturnType<typeof getPriceGuardConfig> }} ctx
 */
export function evaluateCandidate(earphone, item, ctx) {
  const config = ctx.config ?? getPriceGuardConfig();
  const { baseName, variant } = parseModelName(earphone.name);
  const normalizedBase = normalize(baseName);
  const siblingVariants = ctx.variantIndex.get(normalizedBase) ?? [];
  const longerNames =
    ctx.longerNameIndex.get(earphoneKey(earphone)) ?? [];
  const itemName = item.itemName ?? "";
  const normalizedItemName = normalize(itemName);
  const currentPrice = earphone.price;

  if (!itemContainsBaseName(itemName, baseName)) {
    return { ok: false, reason: "base_name_mismatch" };
  }

  const hitKeyword = EXCLUDE_KEYWORDS.find((kw) => itemName.includes(kw));
  if (hitKeyword) {
    return { ok: false, reason: `exclude_keyword:${hitKeyword}` };
  }

  // より長い登録名が候補に含まれる → 長い機種側へ
  // （QuietComfort Earbuds vs Ultra のように語順一致でベースを通ったあとで判定）
  for (const longer of longerNames) {
    if (itemContainsBaseName(itemName, longer)) {
      return { ok: false, reason: "longer_name_preferred" };
    }
  }

  const tokens = extractModelTokens(earphone.name);
  if (!itemContainsModelTokens(itemName, tokens)) {
    return { ok: false, reason: "model_token_mismatch" };
  }

  if (variant) {
    if (!itemMatchesVariant(itemName, variant)) {
      return { ok: false, reason: "variant_mismatch" };
    }
  } else if (siblingVariants.length > 0) {
    if (siblingVariants.some((v) => itemMatchesVariant(itemName, v))) {
      return { ok: false, reason: "sibling_variant" };
    }
  }

  if (
    currentPrice != null &&
    currentPrice > 0 &&
    currentPrice < config.lowThreshold
  ) {
    const brandNorm = normalize(earphone.brand);
    const brandField = normalize(item.itemBrand ?? "");
    if (
      brandNorm &&
      !normalizedItemName.includes(brandNorm) &&
      !brandField.includes(brandNorm)
    ) {
      return { ok: false, reason: "brand_missing" };
    }
  }

  const priceCheck = isPriceInRange(item.itemPrice, currentPrice, config);
  if (!priceCheck.ok && !ctx.ignorePrice) {
    return {
      ok: false,
      reason: "price_out_of_range",
      ratio: priceCheck.ratio,
    };
  }

  const variantSuffix = findUnregisteredVariantSuffix(earphone.name, itemName);
  return {
    ok: true,
    reason: null,
    ratio: priceCheck.ratio,
    variantSuspect: variantSuffix,
  };
}

/** 未登録の派生接尾辞（カタログに無い NC / Pro 等） */
export const VARIANT_SUFFIX_TOKENS = [
  "NC",
  "Pro",
  "Active",
  "Plus",
  "+",
  "Mini",
  "Lite",
  "Max",
  "SE",
  "Gen 2",
  "Gen2",
  "Gen 3",
  "Gen3",
  "Mark II",
  "Mk2",
  "第2世代",
  "第3世代",
];

/**
 * 接尾辞マッチの直後が型番SKUの続きか。
 * 例: Mk2 + G3PA → MK2G3PA、SE + 31BABKUNI → SE31BABKUNI
 * （英字接尾辞の直後に数字が続く／英数字が続くパターン）
 */
export function isSkuTokenContinuation(normalizedSuffix, afterSuffix) {
  if (!afterSuffix) return false;
  // 直後が英数字なら型番の続き（MK2G3PA / SE31…）
  if (/^[a-z0-9]/i.test(afterSuffix[0])) return true;
  // 接尾辞自体が英字のみで、続きが「数字始まりの型番断片」
  if (/^[a-z]+$/i.test(normalizedSuffix) && /^\d[a-z0-9]*/i.test(afterSuffix)) {
    return true;
  }
  return false;
}

/**
 * 登録ベース名の直後に、登録名に含まれない派生接尾辞が付いているか。
 * 付いていればその接尾辞文字列を返す（なければ null）。
 * 登録済みの長い名前（Liberty 4 Pro 等）は longer_name_preferred 側で先に除外される想定。
 */
export function findUnregisteredVariantSuffix(earphoneName, itemName) {
  const { baseName } = parseModelName(earphoneName);
  const normBase = normalize(baseName);
  const normRegistered = normalize(earphoneName);
  const normItem = normalize(itemName);

  let baseEnd = -1;
  const contiguousIdx = normItem.indexOf(normBase);
  if (contiguousIdx !== -1) {
    baseEnd = contiguousIdx + normBase.length;
  } else {
    // 語順一致時は最終語の末尾をベース終端とする
    const words = String(baseName)
      .normalize("NFKC")
      .split(/\s+/)
      .map((w) => normalize(w))
      .filter(Boolean);
    if (words.length < 2) return null;
    let pos = 0;
    for (const word of words) {
      const idx = indexOfModelWord(normItem, word, pos);
      if (idx === -1) return null;
      pos = idx + word.length;
    }
    baseEnd = pos;
  }

  const after = normItem.slice(baseEnd);
  if (!after) return null;

  // 長い接尾辞を先に試す（Gen 2 > 2 など）
  const sorted = [...VARIANT_SUFFIX_TOKENS].sort(
    (a, b) => normalize(b).length - normalize(a).length,
  );

  for (const suffix of sorted) {
    const ns = normalize(suffix);
    if (!ns || !after.startsWith(ns)) continue;
    // 登録名自体が既にその接尾辞で終わる／含むなら「未登録」ではない
    if (normRegistered.endsWith(ns) || normBase.endsWith(ns)) continue;
    const afterSuffix = after.slice(ns.length);
    // 型番SKUの一部（MK2G3PA / SE31BABKUNI 等）は接尾辞扱いしない
    if (isSkuTokenContinuation(ns, afterSuffix)) continue;
    return suffix;
  }

  return null;
}

/** updated_at が thresholdDays 日以上前なら stale_link */
export function isStaleLink(
  updatedAt,
  { now = new Date(), thresholdDays = 7 } = {},
) {
  if (updatedAt == null || updatedAt === "") return false;
  const t = new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return false;
  return now.getTime() - t >= thresholdDays * 24 * 60 * 60 * 1000;
}

/**
 * 価格レンジ以外（型番・除外KW・バリアント）を通過する候補か。
 * price_suggestion 用。price_out_of_range でも ok とする。
 */
export function evaluatePriceProbe(earphone, item, ctx) {
  const result = evaluateCandidate(earphone, item, {
    ...ctx,
    ignorePrice: true,
  });
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }
  return {
    ok: true,
    ratio: result.ratio,
    variantSuspect: result.variantSuspect ?? null,
  };
}

function pickBestRejected(rejected, dominantReason) {
  if (rejected.length === 0) return null;
  const family = reasonFamily(dominantReason);
  const sameFamily = rejected.filter(
    (r) => reasonFamily(r.reason) === family,
  );
  const pool = sameFamily.length > 0 ? sameFamily : rejected;
  return [...pool].sort(
    (a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
  )[0];
}

/**
 * @param {EarphoneLike} earphone
 * @param {Array} rawItems API生データ
 * @param {{
 *   variantIndex: Map<string, string[]>,
 *   longerNameIndex: Map<string, string[]>,
 *   mapItem: (raw: any) => { itemName: string, itemPrice?: number|null, itemBrand?: string|null, itemUrl?: string|null, reviewCount?: number, raw: any },
 *   config?: ReturnType<typeof getPriceGuardConfig>,
 * }} options
 */
export function findBestMatch(earphone, rawItems, options) {
  const mapped = rawItems.map(options.mapItem);
  const rejectedReasons = [];
  /** @type {Array<any>} */
  const rejected = [];
  const candidates = [];
  const priceProbes = [];

  for (const item of mapped) {
    const result = evaluateCandidate(earphone, item, options);
    if (result.ok) {
      candidates.push({
        ...item,
        ratio: result.ratio,
        variantSuspect: result.variantSuspect ?? null,
      });
    } else {
      rejectedReasons.push(result.reason);
      rejected.push({
        ...item,
        reason: result.reason,
        ratio: result.ratio ?? null,
      });
    }

    const probe = evaluatePriceProbe(earphone, item, options);
    // variant_suspect は別機種の疑いがあるので price 提案の根拠から除外
    if (probe.ok && !probe.variantSuspect && item.itemPrice != null) {
      priceProbes.push({
        ...item,
        ratio: probe.ratio,
        variantSuspect: null,
      });
    }
  }

  priceProbes.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
  const priceProbe = priceProbes[0] ?? null;
  const topTitles = mapped.slice(0, 3).map((i) => i.itemName ?? "");

  if (candidates.length === 0) {
    let reason =
      mapped.length === 0
        ? "no_match"
        : (pickDominantReason(rejectedReasons) ?? "no_match");
    // 全候補が base_name_mismatch のみ → 実質マッチなし（調査用に topTitles）
    const families = new Set(rejectedReasons.map((r) => reasonFamily(r)));
    if (families.size === 1 && families.has("base_name_mismatch")) {
      reason = "no_match";
    }
    const bestRejected = pickBestRejected(rejected, reason);
    const excludeHits = rejected.filter(
      (r) => reasonFamily(r.reason) === "exclude_keyword",
    );
    return {
      decision: "reject",
      reason,
      match: null,
      ratio: bestRejected?.ratio ?? null,
      rejectedTitle: bestRejected?.itemName ?? "",
      rejectedPrice: bestRejected?.itemPrice ?? "",
      rejectedRatio:
        bestRejected?.ratio != null
          ? Number(Number(bestRejected.ratio).toFixed(4))
          : "",
      rejectedUrl: bestRejected?.itemUrl ?? "",
      topTitles: reason === "no_match" ? topTitles : [],
      excludeTitles:
        reasonFamily(reason) === "exclude_keyword"
          ? excludeHits.map((r) => r.itemName).filter(Boolean)
          : [],
      priceProbe,
    };
  }

  candidates.sort(
    (a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
  );
  const best = candidates[0];

  // variant_suspect は DB 書き込みしない（hold）。候補名を reason に残す
  if (best.variantSuspect) {
    return {
      decision: "hold",
      reason: `variant_suspect:${best.variantSuspect} | ${best.itemName}`,
      match: best.raw,
      mapped: best,
      ratio: best.ratio,
      variantSuspect: best.variantSuspect,
      rejectedTitle: "",
      rejectedPrice: "",
      rejectedRatio: "",
      rejectedUrl: "",
      topTitles: [],
      excludeTitles: [],
      priceProbe,
    };
  }

  return {
    decision: "accept",
    reason: null,
    match: best.raw,
    mapped: best,
    ratio: best.ratio,
    variantSuspect: null,
    rejectedTitle: "",
    rejectedPrice: "",
    rejectedRatio: "",
    rejectedUrl: "",
    topTitles: [],
    excludeTitles: [],
    priceProbe,
  };
}

function reasonFamily(reason) {
  if (reason == null) return "";
  const i = reason.indexOf(":");
  return i === -1 ? reason : reason.slice(0, i);
}

function pickDominantReason(reasons) {
  if (reasons.length === 0) return null;
  // ベース名一致まで進んだ候補の理由を優先して報告
  const priority = [
    "price_out_of_range",
    "longer_name_preferred",
    "model_token_mismatch",
    "brand_missing",
    "variant_mismatch",
    "sibling_variant",
    "exclude_keyword",
    "base_name_mismatch",
  ];
  const counts = new Map();
  for (const r of reasons) {
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  for (const p of priority) {
    let best = null;
    let bestCount = 0;
    for (const [r, c] of counts) {
      if (reasonFamily(r) === p && c > bestCount) {
        best = r;
        bestCount = c;
      }
    }
    if (best) return best;
  }
  return reasons[0];
}

/** 既存店舗価格が許容レンジ外なら stale_suspect */
export function isStaleSuspect(storePrice, currentPrice, config = getPriceGuardConfig()) {
  if (storePrice == null || currentPrice == null || currentPrice <= 0) {
    return false;
  }
  return !isPriceInRange(storePrice, currentPrice, config).ok;
}

/**
 * 両店舗価格が price と同じ方向に 1.5 倍超ずれていれば price_stale_suspect
 */
export function isPriceStaleSuspect(price, rakutenPrice, yahooPrice) {
  if (price == null || price <= 0) return false;
  if (rakutenPrice == null || yahooPrice == null) return false;

  const r = rakutenPrice / price;
  const y = yahooPrice / price;
  const thr = PRICE_STALE_SAME_DIRECTION_RATIO;

  const bothHigh = r > thr && y > thr;
  const bothLow = r < 1 / thr && y < 1 / thr;
  return bothHigh || bothLow;
}

/**
 * 同一 URL が複数機種に割り当てられたら双方を duplicate_url で却下
 * @param {Array<{ id: string, url: string|null|undefined, decision: string }>} rows
 * @returns {Set<string>} duplicate になった id 集合
 */
export function findDuplicateUrlIds(rows) {
  const byUrl = new Map();
  for (const row of rows) {
    if (row.decision !== "accept" || !row.url) continue;
    const list = byUrl.get(row.url) ?? [];
    list.push(row.id);
    byUrl.set(row.url, list);
  }
  const dupIds = new Set();
  for (const ids of byUrl.values()) {
    if (ids.length >= 2) {
      for (const id of ids) dupIds.add(id);
    }
  }
  return dupIds;
}

export function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const REPORT_COLUMNS = [
  "id",
  "brand",
  "name",
  "store",
  "catalog_price",
  "old_url",
  "new_url",
  "old_price",
  "new_price",
  "ratio",
  "decision",
  "reason",
  "keyword_used",
  "hit_count",
  "keyword_hit_counts",
  "rejected_title",
  "rejected_price",
  "rejected_ratio",
  "rejected_url",
  "top_titles",
  "exclude_titles",
  "probe_title",
  "probe_price",
  "probe_url",
];

export const PRICE_SUGGESTION_COLUMNS = [
  "id",
  "brand",
  "name",
  "price",
  "status",
  "suggested_price",
  "suggest_to_price_ratio",
  "rakuten_probe_title",
  "rakuten_probe_price",
  "yahoo_probe_title",
  "yahoo_probe_price",
  "store_price_ratio",
  "vs_price_ratio",
];

/** 両店舗価格が互いにこの比率以内なら「一致」 */
export const PRICE_SUGGESTION_STORE_AGREE_RATIO = 0.15;
/** price からこの比率以上ずれていれば提案対象 */
export const PRICE_SUGGESTION_DIVERGE_RATIO = 0.35;
/** これ未満の price は自動提案せず一覧のみ */
export const PRICE_SUGGESTION_MIN_PRICE = 5000;
/** 提案値 / price がこれを超えたら要確認 */
export const PRICE_SUGGESTION_MAX_RATIO = 2.0;

export const DRY_RUN_SUMMARY_COLUMNS = [
  "id",
  "brand",
  "name",
  "store",
  "decision",
  "reason",
  "rejected_title",
  "rejected_price",
  "rejected_ratio",
];

export function formatReportCsv(rows, columns = REPORT_COLUMNS) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((col) => csvEscape(row[col])).join(","));
  }
  return lines.join("\n") + "\n";
}

export function summarizeReport(rows) {
  const summary = {
    accept: 0,
    hold: 0,
    reject: 0,
    byReason: /** @type {Record<string, number>} */ ({}),
  };
  for (const row of rows) {
    if (row.decision === "accept") summary.accept++;
    else if (row.decision === "hold") summary.hold++;
    else summary.reject++;
    const reason =
      row.reason ||
      (row.decision === "accept"
        ? "accept"
        : row.decision === "hold"
          ? "hold"
          : "reject");
    summary.byReason[reason] = (summary.byReason[reason] ?? 0) + 1;
  }
  return summary;
}

/**
 * 楽天・Yahoo の probe 価格が互いに15%以内、かつ catalog price と35%以上ずれていれば候補。
 * 提案値は両店舗価格の中央値（2値なので平均）。
 * - price < 5000 → status=list_only（自動提案しない）
 * - suggested/price > 2.0 → status=needs_review
 * - それ以外 → status=suggest
 *
 * @param {Array<{ id: string, brand: string, name: string, price?: number|null, probe_title?: string, probe_price?: number|string|null, store?: string }>} rakutenRows
 * @param {Array<{ id: string, brand: string, name: string, price?: number|null, probe_title?: string, probe_price?: number|string|null, store?: string }>} yahooRows
 */
export function buildPriceSuggestions(rakutenRows, yahooRows) {
  const yahooById = new Map(yahooRows.map((r) => [r.id, r]));
  const suggestions = [];

  for (const r of rakutenRows) {
    const y = yahooById.get(r.id);
    if (!y) continue;
    const rp = Number(r.probe_price);
    const yp = Number(y.probe_price);
    const price = Number(
      r.catalog_price ?? r.price ?? y.catalog_price ?? y.price,
    );
    if (
      !Number.isFinite(rp) ||
      !Number.isFinite(yp) ||
      rp <= 0 ||
      yp <= 0 ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      continue;
    }

    const storeRatio = Math.abs(rp - yp) / Math.max(rp, yp);
    if (storeRatio > PRICE_SUGGESTION_STORE_AGREE_RATIO) continue;

    const suggested = Math.round((rp + yp) / 2);
    const vsPrice = Math.abs(suggested - price) / price;
    if (vsPrice < PRICE_SUGGESTION_DIVERGE_RATIO) continue;

    const suggestToPriceRatio = suggested / price;
    let status = "suggest";
    if (price < PRICE_SUGGESTION_MIN_PRICE) {
      status = "list_only";
    } else if (suggestToPriceRatio > PRICE_SUGGESTION_MAX_RATIO) {
      status = "needs_review";
    }

    suggestions.push({
      id: r.id,
      brand: r.brand,
      name: r.name,
      price,
      status,
      suggested_price: suggested,
      suggest_to_price_ratio: Number(suggestToPriceRatio.toFixed(4)),
      // 根拠の候補名 = カタログ名 / 価格比較に使った店舗出品名 = probe_title
      rakuten_probe_title: r.probe_title ?? "",
      rakuten_probe_price: rp,
      yahoo_probe_title: y.probe_title ?? "",
      yahoo_probe_price: yp,
      store_price_ratio: Number(storeRatio.toFixed(4)),
      vs_price_ratio: Number(vsPrice.toFixed(4)),
    });
  }

  return suggestions;
}

/** status=suggest のみ UPDATE 行（コメントアウト）を出す。他は注記のみ */
export function formatPriceSuggestionSql(suggestions) {
  const auto = suggestions.filter((s) => s.status === "suggest");
  const listOnly = suggestions.filter((s) => s.status === "list_only");
  const review = suggestions.filter((s) => s.status === "needs_review");

  const lines = [
    "-- price 更新提案（DRY_RUN / 手動確認用）。このファイルは実行しないこと。",
    `-- 自動提案: ${auto.length} / 一覧のみ(<${PRICE_SUGGESTION_MIN_PRICE}): ${listOnly.length} / 要確認(比>${PRICE_SUGGESTION_MAX_RATIO}): ${review.length}`,
    "-- 条件: 楽天・Yahoo probe が互いに15%以内、かつ catalog price と35%以上乖離。提案値は両店中央値。",
    `-- price < ${PRICE_SUGGESTION_MIN_PRICE} は自動提案しない。提案/price > ${PRICE_SUGGESTION_MAX_RATIO} は要確認。`,
    "",
  ];

  if (listOnly.length > 0) {
    lines.push(`-- --- 一覧のみ (price < ${PRICE_SUGGESTION_MIN_PRICE}) ---`);
    for (const s of listOnly) {
      lines.push(
        `-- [list_only] ${s.brand} ${s.name}: price ${s.price} → ${s.suggested_price}` +
          ` (比${s.suggest_to_price_ratio})` +
          ` rakuten「${s.rakuten_probe_title}」¥${s.rakuten_probe_price}` +
          ` / yahoo「${s.yahoo_probe_title}」¥${s.yahoo_probe_price}`,
      );
    }
    lines.push("");
  }

  if (review.length > 0) {
    lines.push(
      `-- --- 要確認 (提案/price > ${PRICE_SUGGESTION_MAX_RATIO}) ---`,
    );
    for (const s of review) {
      lines.push(
        `-- [needs_review] ${s.brand} ${s.name}: price ${s.price} → ${s.suggested_price}` +
          ` (比${s.suggest_to_price_ratio})` +
          ` rakuten「${s.rakuten_probe_title}」¥${s.rakuten_probe_price}` +
          ` / yahoo「${s.yahoo_probe_title}」¥${s.yahoo_probe_price}`,
      );
    }
    lines.push("");
  }

  lines.push("-- --- 自動提案 (UPDATE はコメントのまま) ---");
  for (const s of auto) {
    lines.push(
      `-- ${s.brand} ${s.name}: price ${s.price} → ${s.suggested_price}` +
        ` (rakuten¥${s.rakuten_probe_price} / yahoo¥${s.yahoo_probe_price})` +
        ` 出品: 楽天「${s.rakuten_probe_title}」 / Yahoo「${s.yahoo_probe_title}」`,
    );
    lines.push(
      `-- UPDATE earphones SET price = ${s.suggested_price} WHERE id = '${s.id}';`,
    );
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * reject/hold 行の要約表（URL列なし）。hold は候補名全文と登録URLスラッグを追記。
 * @param {Array<Record<string, any>>} rows
 */
export function formatDryRunSummaryMarkdown(rows) {
  const targets = rows.filter(
    (r) => r.decision === "reject" || r.decision === "hold",
  );
  const lines = [
    "# DRY_RUN summary (reject / hold)",
    "",
    `件数: ${targets.length}`,
    "",
    `| ${DRY_RUN_SUMMARY_COLUMNS.join(" | ")} |`,
    `| ${DRY_RUN_SUMMARY_COLUMNS.map(() => "---").join(" | ")} |`,
  ];

  for (const r of targets) {
    const cells = DRY_RUN_SUMMARY_COLUMNS.map((col) => {
      let v = r[col] ?? "";
      if (col === "rejected_title" && r.decision === "hold" && !v) {
        v = holdCandidateTitle(r.reason);
      }
      return String(v).replace(/\|/g, "\\|").replace(/\n/g, " ");
    });
    lines.push(`| ${cells.join(" | ")} |`);
    if (r.decision === "hold") {
      const candidate =
        holdCandidateTitle(r.reason) || r.rejected_title || "";
      const slug = urlPathSlug(r.old_url);
      lines.push(
        `| ↳ hold detail | | | | | candidate: ${String(candidate).replace(/\|/g, "\\|")} | slug: ${slug} | | |`,
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}

/** report row 用の空フィールド */
export function emptyRejectExtras() {
  return {
    keyword_used: "",
    hit_count: "",
    keyword_hit_counts: "",
    rejected_title: "",
    rejected_price: "",
    rejected_ratio: "",
    rejected_url: "",
    top_titles: "",
    exclude_titles: "",
    probe_title: "",
    probe_price: "",
    probe_url: "",
  };
}

export function searchMetaFields({ keywordUsed, hitCount, attempts }) {
  return {
    keyword_used: keywordUsed ?? "",
    hit_count: hitCount ?? "",
    keyword_hit_counts: formatKeywordHitCounts(attempts),
  };
}

export function probeFieldsFromMatch(result) {
  const probe = result.priceProbe;
  if (!probe) {
    return { probe_title: "", probe_price: "", probe_url: "" };
  }
  return {
    probe_title: probe.itemName ?? "",
    probe_price: probe.itemPrice ?? "",
    probe_url: probe.itemUrl ?? "",
  };
}

export function rejectExtrasFromMatch(result) {
  return {
    rejected_title: result.rejectedTitle ?? "",
    rejected_price: result.rejectedPrice ?? "",
    rejected_ratio: result.rejectedRatio ?? "",
    rejected_url: result.rejectedUrl ?? "",
    top_titles: (result.topTitles ?? []).join(" | "),
    exclude_titles: (result.excludeTitles ?? []).join(" | "),
    ...probeFieldsFromMatch(result),
  };
}

export function parseCliFlags(argv = process.argv.slice(2)) {
  return {
    clearInvalid: argv.includes("--clear-invalid"),
  };
}

export function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseSimpleCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    /** @type {Record<string, string>} */
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}
