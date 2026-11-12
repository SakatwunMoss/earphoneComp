import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  brandAliasList,
  brandPresentInCandidate,
  buildLongerNameIndex,
  buildPriceSuggestions,
  buildSearchKeywordList,
  buildVariantIndex,
  evaluateCandidate,
  extractModelTokens,
  findBestMatch,
  findDuplicateUrlIds,
  findUnregisteredVariantSuffix,
  formatDryRunSummaryMarkdown,
  getApiPriceRange,
  getPriceRatioBounds,
  holdCandidateTitle,
  isAccessorySuspect,
  isPriceInRange,
  isPriceStaleSuspect,
  isStaleLink,
  isStaleSuspect,
  itemContainsModelToken,
  normalize,
  enlargeRakutenImageUrl,
  pickRakutenImageUrl,
  pickYahooImageUrl,
  RAKUTEN_IMAGE_EX_SIZE,
  resolveImageUrlUpdate,
  YAHOO_PREFERRED_IMAGE_SIZE,
  searchWithKeywordFallback,
  stripParentheticals,
  urlPathSlug,
} from "./affiliate-match.mjs";

function ctxFor(earphones, config) {
  return {
    variantIndex: buildVariantIndex(earphones),
    longerNameIndex: buildLongerNameIndex(earphones),
    config: config ?? {
      ratioMin: 0.6,
      ratioMax: 1.6,
      lowThreshold: 5000,
      lowMin: 0.7,
      lowMax: 1.4,
    },
  };
}

function mapSimple(raw) {
  return {
    itemName: raw.itemName ?? raw.name,
    itemPrice: raw.itemPrice ?? raw.price ?? null,
    itemBrand: raw.itemBrand ?? raw.brand ?? null,
    itemUrl: raw.itemUrl ?? raw.url ?? null,
    reviewCount: raw.reviewCount ?? 0,
    raw,
  };
}

describe("price guard", () => {
  it("default bounds are 0.6–1.6; under 5000 use 0.7–1.4", () => {
    assert.deepEqual(getPriceRatioBounds(10000), { min: 0.6, max: 1.6 });
    assert.deepEqual(getPriceRatioBounds(2979), { min: 0.7, max: 1.4 });
  });

  it("rejects TAT1209 candidate at 6700 against price 2979", () => {
    const earphone = {
      id: "tat",
      brand: "Philips",
      name: "TAT1209",
      price: 2979,
    };
    const earphones = [earphone];
    const result = evaluateCandidate(
      earphone,
      {
        itemName: "Philips TAT1209 ワイヤレスイヤホン",
        itemPrice: 6700,
        itemBrand: "Philips",
      },
      ctxFor(earphones),
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "price_out_of_range");
  });
});

describe("longer name assignment (fixed pairs)", () => {
  const pairs = [
    {
      brand: "Jabra",
      short: "Elite 4",
      long: "Elite 4 Active",
      title: "Jabra Elite 4 Active 完全ワイヤレス",
    },
    {
      brand: "Anker",
      short: "Soundcore Liberty 4",
      long: "Soundcore Liberty 4 Pro",
      title: "Anker Soundcore Liberty 4 Pro イヤホン",
    },
    {
      brand: "Apple",
      short: "AirPods 4",
      long: "AirPods 4(ANCモデル)",
      title: "Apple AirPods 4 ANC ノイズキャンセリング",
      // 括弧バリアントは sibling_variant でも落ちる
      expectShortReasons: ["longer_name_preferred", "sibling_variant"],
    },
    {
      brand: "Apple",
      short: "AirPods 5",
      long: "AirPods 5(ワイヤレス充電ケース付き)",
      title: "Apple AirPods 5 ワイヤレス充電ケース付き",
      expectShortReasons: ["longer_name_preferred", "sibling_variant"],
    },
    {
      brand: "Google",
      short: "Pixel Buds Pro(初代)",
      long: "Pixel Buds Pro 2",
      title: "Google Pixel Buds Pro 2 ワイヤレスイヤホン",
    },
    {
      brand: "Bose",
      short: "QuietComfort Earbuds",
      long: "QuietComfort Ultra Earbuds(第2世代)",
      title: "Bose QuietComfort Ultra Earbuds 第2世代",
    },
    {
      brand: "Final",
      short: "E500",
      long: "E1000",
      title: "Final E1000 カナル型イヤホン",
      // 型番トークン / ベース名で分離（長い名前割り当てではない）
      expectShortReasons: ["base_name_mismatch", "model_token_mismatch"],
    },
  ];

  for (const pair of pairs) {
    it(`assigns "${pair.title}" to longer/correct model, not ${pair.short}`, () => {
      const shortEp = {
        id: "short",
        brand: pair.brand,
        name: pair.short,
        price: 10000,
      };
      const longEp = {
        id: "long",
        brand: pair.brand,
        name: pair.long,
        price: 15000,
      };
      const earphones = [shortEp, longEp];
      const ctx = ctxFor(earphones);

      const shortResult = evaluateCandidate(
        shortEp,
        {
          itemName: pair.title,
          itemPrice: 12000,
          itemBrand: pair.brand,
        },
        ctx,
      );
      assert.equal(shortResult.ok, false);
      const expected =
        pair.expectShortReasons ?? ["longer_name_preferred"];
      assert.ok(
        expected.includes(shortResult.reason),
        `expected one of ${expected.join("|")}, got ${shortResult.reason}`,
      );

      const longResult = evaluateCandidate(
        longEp,
        {
          itemName: pair.title,
          itemPrice: 12000,
          itemBrand: pair.brand,
        },
        ctx,
      );
      assert.equal(
        longResult.ok,
        true,
        `long should accept: ${longResult.reason}`,
      );
    });
  }

  it("Elite 4 plain title is not stolen by Active when matching Elite 4", () => {
    const shortEp = {
      id: "e4",
      brand: "Jabra",
      name: "Elite 4",
      price: 9450,
    };
    const longEp = {
      id: "e4a",
      brand: "Jabra",
      name: "Elite 4 Active",
      price: 12000,
    };
    const result = evaluateCandidate(
      shortEp,
      {
        itemName: "Jabra Elite 4 完全ワイヤレスイヤホン",
        itemPrice: 9500,
        itemBrand: "Jabra",
      },
      ctxFor([shortEp, longEp]),
    );
    assert.equal(result.ok, true);
  });

  it("does not match Liberty 4 to a Liberty 5 listing (digit boundary)", () => {
    const liberty4 = {
      id: "l4",
      brand: "Anker",
      name: "Soundcore Liberty 4",
      price: 14990,
    };
    const liberty5 = {
      id: "l5",
      brand: "Anker",
      name: "Soundcore Liberty 5",
      price: 14990,
    };
    const result = evaluateCandidate(
      liberty4,
      {
        itemName:
          "18ヶ月保証 Anker Soundcore Liberty 5 Bluetooth 5.4 A3957",
        itemPrice: 11960,
        itemBrand: "Anker",
      },
      ctxFor([liberty4, liberty5]),
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "base_name_mismatch");
  });
});

describe("variant_suspect / exclude_keyword / stale_link", () => {
  it("holds Liberty 4 NC as variant_suspect (does not accept / write)", () => {
    const liberty4 = {
      id: "l4",
      brand: "Anker",
      name: "Soundcore Liberty 4",
      price: 14990,
    };
    const liberty4Pro = {
      id: "l4p",
      brand: "Anker",
      name: "Soundcore Liberty 4 Pro",
      price: 19990,
    };
    const title =
      "Anker Soundcore Liberty 4 NC ワイヤレスイヤホン ノイズキャンセリング";
    const result = findBestMatch(
      liberty4,
      [
        {
          itemName: title,
          itemPrice: 12980,
          itemBrand: "Anker",
          reviewCount: 50,
        },
      ],
      { ...ctxFor([liberty4, liberty4Pro]), mapItem: mapSimple },
    );
    assert.equal(result.decision, "hold");
    assert.equal(result.reason, `variant_suspect:NC | ${title}`);
    assert.equal(
      findUnregisteredVariantSuffix(
        "Soundcore Liberty 4",
        "Anker Soundcore Liberty 4 NC イヤホン",
      ),
      "NC",
    );
  });

  it("still prefers registered Liberty 4 Pro over short Liberty 4", () => {
    const liberty4 = {
      id: "l4",
      brand: "Anker",
      name: "Soundcore Liberty 4",
      price: 14990,
    };
    const liberty4Pro = {
      id: "l4p",
      brand: "Anker",
      name: "Soundcore Liberty 4 Pro",
      price: 19990,
    };
    const result = evaluateCandidate(
      liberty4,
      {
        itemName: "Anker Soundcore Liberty 4 Pro イヤホン",
        itemPrice: 15980,
        itemBrand: "Anker",
      },
      ctxFor([liberty4, liberty4Pro]),
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "longer_name_preferred");
  });

  it("includes hit keyword in exclude_keyword reason", () => {
    const ep = {
      id: "p",
      brand: "Google",
      name: "Pixel Buds 2a",
      price: 23800,
    };
    const result = evaluateCandidate(
      ep,
      {
        itemName: "Google Pixel Buds 2a 落下防止ストラップ",
        itemPrice: 20000,
        itemBrand: "Google",
      },
      ctxFor([ep]),
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "exclude_keyword:ストラップ");
  });

  it("reports exclude_titles on exclude_keyword reject", () => {
    const ep = {
      id: "p",
      brand: "Google",
      name: "Pixel Buds 2a",
      price: 23800,
    };
    // 用/対応/適用を含まない（accessory_suspect ではなく exclude_keyword 経路）
    const coverTitle = "Google Pixel Buds 2a シリコンカバー";
    const result = findBestMatch(
      ep,
      [
        {
          itemName: coverTitle,
          itemPrice: 12000,
          itemBrand: "Google",
          reviewCount: 10,
          itemUrl: "https://example.com/cover",
        },
      ],
      { ...ctxFor([ep]), mapItem: mapSimple },
    );
    assert.equal(result.decision, "reject");
    assert.equal(result.reason, "exclude_keyword:カバー");
    assert.deepEqual(result.excludeTitles, [coverTitle]);
  });

  it("detects stale_link when updated_at is 7+ days old", () => {
    const now = new Date("2026-11-12T12:00:00Z");
    assert.equal(
      isStaleLink("2026-11-01T00:00:00Z", { now, thresholdDays: 7 }),
      true,
    );
    assert.equal(
      isStaleLink("2026-11-10T00:00:00Z", { now, thresholdDays: 7 }),
      false,
    );
    assert.equal(isStaleLink(null, { now }), false);
  });

  it("does not treat product SKU MK2G3PA as variant_suspect Mk2", () => {
    assert.equal(
      findUnregisteredVariantSuffix(
        "Beats Fit Pro",
        "Beats Fit Pro MK2G3PA/A ホワイト",
      ),
      null,
    );
  });

  it("does not treat Shure SE* SKU after AONIC as variant_suspect SE", () => {
    assert.equal(
      findUnregisteredVariantSuffix(
        "AONIC 3",
        "SHURE シュア AONIC3 SE31BABKUNI-A 高遮音性イヤホン",
      ),
      null,
    );
    assert.equal(
      findUnregisteredVariantSuffix(
        "AONIC 4",
        "SHURE シュア AONIC4 SE42HYW+UNI-A 高遮音性イヤホン ホワイト",
      ),
      null,
    );
  });
});

describe("model tokens", () => {
  it("extracts codes and word+number tokens", () => {
    assert.ok(extractModelTokens("WF-1000XM5").includes("WF-1000XM5"));
    assert.ok(extractModelTokens("TAT1209").includes("TAT1209"));
    assert.ok(extractModelTokens("Elite 4").some((t) => normalize(t) === "elite4"));
    assert.ok(extractModelTokens("E500").includes("E500"));
  });
});

describe("findBestMatch + duplicate URL", () => {
  it("returns reject with price_out_of_range when only expensive candidates exist", () => {
    const earphone = {
      id: "1",
      brand: "Philips",
      name: "TAT1209",
      price: 2979,
    };
    const result = findBestMatch(
      earphone,
      [
        {
          itemName: "Philips TAT1209 イヤホン",
          itemPrice: 6700,
          itemBrand: "Philips",
          reviewCount: 100,
          itemUrl: "https://example.com/tat",
        },
      ],
      {
        ...ctxFor([earphone]),
        mapItem: mapSimple,
      },
    );
    assert.equal(result.decision, "reject");
    assert.equal(result.reason, "price_out_of_range");
    assert.equal(result.rejectedTitle, "Philips TAT1209 イヤホン");
    assert.equal(result.rejectedPrice, 6700);
    assert.equal(result.rejectedUrl, "https://example.com/tat");
    assert.ok(result.priceProbe);
    assert.equal(result.priceProbe.itemPrice, 6700);
  });

  it("includes topTitles on no_match", () => {
    const earphone = {
      id: "1",
      brand: "Philips",
      name: "TAT3508",
      price: 5000,
    };
    const result = findBestMatch(
      earphone,
      [
        {
          itemName: "別商品A イヤホン",
          itemPrice: 3000,
          reviewCount: 1,
        },
        {
          itemName: "別商品B ヘッドホン",
          itemPrice: 4000,
          reviewCount: 2,
        },
        {
          itemName: "別商品C",
          itemPrice: 5000,
          reviewCount: 3,
        },
      ],
      { ...ctxFor([earphone]), mapItem: mapSimple },
    );
    assert.equal(result.decision, "reject");
    assert.equal(result.reason, "no_match");
    assert.deepEqual(result.topTitles, [
      "別商品A イヤホン",
      "別商品B ヘッドホン",
      "別商品C",
    ]);
  });

  it("marks duplicate URLs on both rows", () => {
    const dup = findDuplicateUrlIds([
      { id: "a", url: "https://example.com/x", decision: "accept" },
      { id: "b", url: "https://example.com/x", decision: "accept" },
      { id: "c", url: "https://example.com/y", decision: "accept" },
      { id: "d", url: "https://example.com/x", decision: "hold" },
    ]);
    assert.ok(dup.has("a"));
    assert.ok(dup.has("b"));
    assert.equal(dup.has("c"), false);
    assert.equal(dup.has("d"), false);
  });
});

describe("price suggestions", () => {
  it("suggests median when stores agree within 15% and diverge from price ≥35%", () => {
    const suggestions = buildPriceSuggestions(
      [
        {
          id: "1",
          brand: "Shure",
          name: "AONIC 4",
          price: 32800,
          probe_title: "楽天 AONIC 4",
          probe_price: 50000,
        },
      ],
      [
        {
          id: "1",
          brand: "Shure",
          name: "AONIC 4",
          price: 32800,
          probe_title: "Yahoo AONIC 4",
          probe_price: 55000,
        },
      ],
    );
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].suggested_price, 52500);
    assert.equal(suggestions[0].status, "suggest");
    assert.ok(suggestions[0].vs_price_ratio >= 0.35);
  });

  it("marks list_only when catalog price < 5000", () => {
    const suggestions = buildPriceSuggestions(
      [
        {
          id: "1",
          brand: "Philips",
          name: "TAT1209",
          price: 2979,
          probe_title: "楽天 TAT1209",
          probe_price: 7646,
        },
      ],
      [
        {
          id: "1",
          brand: "Philips",
          name: "TAT1209",
          price: 2979,
          probe_title: "Yahoo TAT1209",
          probe_price: 7700,
        },
      ],
    );
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].status, "list_only");
  });

  it("marks needs_review when suggested/price > 2.0", () => {
    const suggestions = buildPriceSuggestions(
      [
        {
          id: "1",
          brand: "Brand",
          name: "Model X",
          price: 10000,
          probe_title: "楽天 Model X",
          probe_price: 22000,
        },
      ],
      [
        {
          id: "1",
          brand: "Brand",
          name: "Model X",
          price: 10000,
          probe_title: "Yahoo Model X",
          probe_price: 23000,
        },
      ],
    );
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].status, "needs_review");
    assert.ok(suggestions[0].suggest_to_price_ratio > 2.0);
  });
});

describe("brand aliases", () => {
  const brandAliases = {
    MilLink: ["Mi", "MiLink", "Mi-Link"],
    OPPO: ["Oppo"],
  };

  it("resolves aliases case-insensitively (keys and alias dedupe)", () => {
    assert.deepEqual(brandAliasList("millink", brandAliases), [
      "Mi",
      "MiLink",
      "Mi-Link",
    ]);
    assert.deepEqual(brandAliasList("oppo", brandAliases), ["Oppo"]);
    assert.deepEqual(
      brandAliasList("OPPO", { OPPO: ["Oppo", "oppo", "OPPO"] }),
      ["Oppo"],
    );
  });

  it("passes brand-required check when MilLink itemBrand is Mi", () => {
    const earphone = {
      id: "millink-tune03",
      brand: "MilLink",
      name: "Mi Tune03",
      price: 3980,
    };
    const item = {
      itemName: "Mi Tune03 ワイヤレスイヤホン",
      itemPrice: 3980,
      itemBrand: "Mi",
    };
    const without = evaluateCandidate(earphone, item, ctxFor([earphone]));
    assert.equal(without.ok, false);
    assert.equal(without.reason, "brand_missing");

    const withAliases = evaluateCandidate(earphone, item, {
      ...ctxFor([earphone]),
      brandAliases,
    });
    assert.equal(withAliases.ok, true);
    assert.equal(withAliases.reason, null);

    assert.equal(
      brandPresentInCandidate(
        "MilLink",
        normalize(item.itemName),
        normalize(item.itemBrand),
        brandAliases,
      ),
      true,
    );
  });

  it("includes brand aliases in search keyword list", () => {
    const list = buildSearchKeywordList(
      "MilLink",
      "Mi Tune03",
      {},
      brandAliases,
    );
    assert.equal(list[0], "MilLink Mi Tune03");
    assert.ok(list.includes("Mi Mi Tune03"));
    assert.ok(list.includes("MiLink Mi Tune03"));
    assert.ok(list.includes("Mi-Link Mi Tune03"));
  });
});

describe("search keyword fallback", () => {
  it("builds brand+name, name-only, stripped, katakana, then aliases", () => {
    const list = buildSearchKeywordList("Google", "Pixel Buds Pro(初代)", {
      "Google|Pixel Buds Pro(初代)": ["Pixel Buds Pro alias"],
    });
    assert.deepEqual(list, [
      "Google Pixel Buds Pro(初代)",
      "Pixel Buds Pro(初代)",
      "Pixel Buds Pro",
      "グーグル Pixel Buds Pro(初代)",
      "グーグル Pixel Buds Pro",
      "Pixel Buds Pro alias",
    ]);
  });

  it("stripParentheticals removes all paren segments", () => {
    assert.equal(stripParentheticals("Pixel Buds Pro(初代)"), "Pixel Buds Pro");
  });

  it("searchWithKeywordFallback stops at first non-empty result", async () => {
    const calls = [];
    const result = await searchWithKeywordFallback(
      async (kw) => {
        calls.push(kw);
        if (kw === "TAT3508") return [{ itemName: "ok" }];
        return [];
      },
      ["Philips TAT3508", "TAT3508", "alias"],
    );
    assert.deepEqual(calls, ["Philips TAT3508", "TAT3508"]);
    assert.equal(result.keywordUsed, "TAT3508");
    assert.equal(result.hitCount, 1);
    assert.equal(result.attempts.length, 2);
  });

  it("retries once on API error then records error distinct from 0 hits", async () => {
    let n = 0;
    const sleeps = [];
    const result = await searchWithKeywordFallback(
      async (kw) => {
        n++;
        if (kw === "A") {
          const err = new Error("boom");
          err.status = 503;
          err.body = '{"error":"busy"}';
          throw err;
        }
        return [];
      },
      ["A", "B"],
      {
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        intervalMs: 10,
      },
    );
    // A: try + retry, then B
    assert.equal(n, 3);
    assert.equal(result.attempts[0].error, "boom");
    assert.equal(result.attempts[0].status, 503);
    assert.equal(result.attempts[0].hitCount, 0);
    assert.equal(result.attempts[1].hitCount, 0);
    assert.equal(result.attempts[1].error, undefined);
    assert.match(
      result.attempts.map((a) =>
        a.error ? `${a.keyword}:error:HTTP${a.status}` : `${a.keyword}:${a.hitCount}`,
      ).join(" | "),
      /A:error:HTTP503 \| B:0/,
    );
  });
});

describe("accessory_suspect + model color suffix", () => {
  it("rejects Jabra Elite 5 accessory charging case as accessory_suspect", () => {
    const elite5 = {
      id: "e5",
      brand: "Jabra",
      name: "Elite 5",
      price: 15000,
    };
    const elite4 = {
      id: "e4",
      brand: "Jabra",
      name: "Elite 4",
      price: 9450,
    };
    const title = "Jabra Elite 5 対応 USB充電ケース";
    assert.equal(isAccessorySuspect(title, 3000, 15000), true);
    const result = evaluateCandidate(
      elite5,
      { itemName: title, itemPrice: 3980, itemBrand: "Jabra" },
      ctxFor([elite4, elite5]),
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "accessory_suspect");
  });

  it("does not treat 未使用+ケース付き本体 as accessory_suspect by 用 alone", () => {
    assert.equal(
      isAccessorySuspect(
        "【未使用】Apple AirPods 5 ワイヤレス充電ケース付きモデル",
        25980,
        30000,
      ),
      false,
    );
  });

  it("matches TAT3508BK/97 candidate to TAT3508 model token", () => {
    assert.equal(
      itemContainsModelToken(
        "Philips フィリップス TAT3508BK/97 ワイヤレスイヤホン",
        "TAT3508",
      ),
      true,
    );
    const ep = {
      id: "tat",
      brand: "Philips",
      name: "TAT3508",
      price: 8000,
    };
    const result = evaluateCandidate(
      ep,
      {
        itemName: "Philips TAT3508BK/97 完全ワイヤレスイヤホン",
        itemPrice: 8500,
        itemBrand: "Philips",
      },
      ctxFor([ep]),
    );
    assert.equal(result.ok, true, result.reason);
  });

  it("still prefers Elite 4 Active over Elite 4 for long titles", () => {
    const shortEp = {
      id: "e4",
      brand: "Jabra",
      name: "Elite 4",
      price: 9450,
    };
    const longEp = {
      id: "e4a",
      brand: "Jabra",
      name: "Elite 4 Active",
      price: 12000,
    };
    const title = "Jabra Elite 4 Active 完全ワイヤレス";
    const shortResult = evaluateCandidate(
      shortEp,
      { itemName: title, itemPrice: 12000, itemBrand: "Jabra" },
      ctxFor([shortEp, longEp]),
    );
    assert.equal(shortResult.ok, false);
    assert.equal(shortResult.reason, "longer_name_preferred");
    const longResult = evaluateCandidate(
      longEp,
      { itemName: title, itemPrice: 12000, itemBrand: "Jabra" },
      ctxFor([shortEp, longEp]),
    );
    assert.equal(longResult.ok, true);
  });

  it("marks very cheap candidates as accessory_suspect not price_out_of_range", () => {
    const ep = {
      id: "e5",
      brand: "Jabra",
      name: "Elite 5",
      price: 15000,
    };
    const result = evaluateCandidate(
      ep,
      {
        itemName: "Jabra Elite 5 ワイヤレスイヤホン本体",
        itemPrice: 2000,
        itemBrand: "Jabra",
      },
      ctxFor([ep]),
    );
    assert.equal(result.ok, false);
    assert.equal(result.reason, "accessory_suspect");
  });

  it("getApiPriceRange uses same ratios as price guard", () => {
    assert.deepEqual(getApiPriceRange(10000), {
      minPrice: 6000,
      maxPrice: 16000,
    });
    assert.deepEqual(getApiPriceRange(2979), {
      minPrice: Math.floor(2979 * 0.7),
      maxPrice: Math.ceil(2979 * 1.4),
    });
    assert.equal(getApiPriceRange(null), null);
  });
});

describe("dry-run summary helpers", () => {
  it("extracts hold candidate and url slug", () => {
    assert.equal(
      holdCandidateTitle("variant_suspect:NC | Liberty 4 NC 完全ワイヤレス"),
      "Liberty 4 NC 完全ワイヤレス",
    );
    assert.equal(
      urlPathSlug("https://item.rakuten.co.jp/shop/abc-123/"),
      "abc-123",
    );
  });

  it("formats reject/hold markdown without url columns", () => {
    const md = formatDryRunSummaryMarkdown([
      {
        id: "1",
        brand: "A",
        name: "B",
        store: "rakuten",
        decision: "reject",
        reason: "no_match",
        rejected_title: "",
        rejected_price: "",
        rejected_ratio: "",
        old_url: "https://example.com/x",
        new_url: "https://example.com/y",
      },
      {
        id: "2",
        brand: "C",
        name: "D",
        store: "yahoo",
        decision: "hold",
        reason: "variant_suspect:NC | Full Title Here",
        rejected_title: "",
        rejected_price: "",
        rejected_ratio: "",
        old_url: "https://store.shopping.yahoo.co.jp/shop/slug-99.html",
      },
      {
        id: "3",
        brand: "E",
        name: "F",
        store: "rakuten",
        decision: "accept",
        reason: "",
      },
    ]);
    assert.match(md, /no_match/);
    assert.match(md, /Full Title Here/);
    assert.match(md, /slug-99\.html/);
    assert.equal(md.includes("https://example.com"), false);
    assert.equal(md.includes("accept"), false);
  });
});

describe("image_url helpers", () => {
  it("enlarges Rakuten _ex size for display", () => {
    assert.equal(RAKUTEN_IMAGE_EX_SIZE, "800x800");
    assert.equal(
      enlargeRakutenImageUrl(
        "https://thumbnail.image.rakuten.co.jp/@0_mall/x/cabinet/a.jpg?_ex=128x128",
      ),
      "https://thumbnail.image.rakuten.co.jp/@0_mall/x/cabinet/a.jpg?_ex=800x800",
    );
    assert.equal(
      enlargeRakutenImageUrl(
        "https://thumbnail.image.rakuten.co.jp/@0_mall/x/cabinet/a.jpg",
      ),
      "https://thumbnail.image.rakuten.co.jp/@0_mall/x/cabinet/a.jpg?_ex=800x800",
    );
    assert.equal(
      enlargeRakutenImageUrl(
        "https://thumbnail.image.rakuten.co.jp/@0_mall/x/cabinet/a.jpg?foo=1",
      ),
      "https://thumbnail.image.rakuten.co.jp/@0_mall/x/cabinet/a.jpg?foo=1&_ex=800x800",
    );
    assert.equal(enlargeRakutenImageUrl(null), null);
    assert.equal(enlargeRakutenImageUrl("  "), null);
  });

  it("picks Rakuten mediumImageUrls first entry and enlarges _ex", () => {
    assert.equal(
      pickRakutenImageUrl({
        mediumImageUrls: [
          "https://thumbnail.image.rakuten.co.jp/?_ex=128x128&id=a",
          "https://thumbnail.image.rakuten.co.jp/?_ex=128x128&id=b",
        ],
      }),
      "https://thumbnail.image.rakuten.co.jp/?_ex=800x800&id=a",
    );
    assert.equal(
      pickRakutenImageUrl({
        mediumImageUrls: [
          { imageUrl: "https://thumbnail.image.rakuten.co.jp/?_ex=128x128&id=c" },
        ],
      }),
      "https://thumbnail.image.rakuten.co.jp/?_ex=800x800&id=c",
    );
    assert.equal(pickRakutenImageUrl({ mediumImageUrls: [] }), null);
    assert.equal(pickRakutenImageUrl({}), null);
  });

  it("prefers Yahoo exImage.url over image.medium", () => {
    assert.equal(YAHOO_PREFERRED_IMAGE_SIZE, 600);
    assert.equal(
      pickYahooImageUrl({
        image: { medium: "https://item-shopping.c.yimg.jp/i/g/abc" },
        exImage: {
          url: "https://item-shopping.c.yimg.jp/i/w/abc",
          width: 600,
          height: 600,
        },
      }),
      "https://item-shopping.c.yimg.jp/i/w/abc",
    );
    assert.equal(
      pickYahooImageUrl({
        image: { medium: "https://item-shopping.c.yimg.jp/i/g/abc" },
      }),
      "https://item-shopping.c.yimg.jp/i/g/abc",
    );
    assert.equal(pickYahooImageUrl({ image: { medium: "  " } }), null);
    assert.equal(pickYahooImageUrl({}), null);
  });

  it("sets image_url only when current is blank", () => {
    assert.equal(
      resolveImageUrlUpdate(null, "https://example.com/a.jpg"),
      "https://example.com/a.jpg",
    );
    assert.equal(
      resolveImageUrlUpdate("", "https://example.com/a.jpg"),
      "https://example.com/a.jpg",
    );
    assert.equal(
      resolveImageUrlUpdate("https://existing.example/x.jpg", "https://example.com/a.jpg"),
      null,
    );
    assert.equal(resolveImageUrlUpdate(null, null), null);
    assert.equal(resolveImageUrlUpdate(null, "  "), null);
  });
});

describe("stale detection", () => {
  it("flags stale_suspect when existing store price is out of range", () => {
    assert.equal(isStaleSuspect(21768, 9450), true);
    assert.equal(isStaleSuspect(9500, 9450), false);
  });

  it("flags price_stale_suspect when both stores diverge same direction >1.5x", () => {
    assert.equal(isPriceStaleSuspect(10000, 22000, 20000), true);
    assert.equal(isPriceStaleSuspect(10000, 4000, 4500), true);
    assert.equal(isPriceStaleSuspect(10000, 22000, 9000), false);
  });

  it("isPriceInRange respects low-price band", () => {
    assert.equal(isPriceInRange(6700, 2979).ok, false);
    assert.equal(isPriceInRange(3000, 2979).ok, true);
  });
});
