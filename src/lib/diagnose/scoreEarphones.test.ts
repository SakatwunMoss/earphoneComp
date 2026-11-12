import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  budgetMax,
  recommendEarphones,
  type BudgetPreference,
  type ConnectionPreference,
  type NcPreference,
  type QuizAnswers,
  type WaterPreference,
} from "@/lib/diagnose/scoreEarphones";
import type { Earphone } from "@/types/database";

type FixtureRow = {
  brand: string;
  name: string;
  price: number;
  category: string;
  noise_cancelling: boolean;
  water_resistance?: string | null;
};

/** 要件の12機種（低価格帯シミュレーション用） */
const FIXTURE_ROWS: FixtureRow[] = [
  {
    brand: "Apple",
    name: "EarPods 3.5mm",
    price: 2480,
    category: "有線",
    noise_cancelling: false,
  },
  {
    brand: "Final",
    name: "E500",
    price: 2580,
    category: "有線",
    noise_cancelling: false,
  },
  {
    brand: "Final",
    name: "E1000",
    price: 2980,
    category: "有線",
    noise_cancelling: false,
  },
  {
    brand: "JBL",
    name: "TUNE 305C",
    price: 3520,
    category: "有線",
    noise_cancelling: false,
  },
  {
    brand: "radius",
    name: "HP-NEF11",
    price: 3190,
    category: "有線",
    noise_cancelling: false,
  },
  {
    brand: "Sennheiser",
    name: "CX 300-II",
    price: 3480,
    category: "有線",
    noise_cancelling: false,
  },
  {
    brand: "Sony",
    name: "MDR-EX155",
    price: 2178,
    category: "有線",
    noise_cancelling: false,
  },
  {
    brand: "Sony",
    name: "WI-C100",
    price: 3741,
    category: "ワイヤレス(ネックバンド)",
    noise_cancelling: false,
  },
  {
    brand: "OPPO",
    name: "Enco Buds 3 Pro",
    price: 2899,
    category: "完全ワイヤレス",
    noise_cancelling: false,
  },
  {
    brand: "Baseus",
    name: "Bowie E3 Mini",
    price: 2980,
    category: "完全ワイヤレス",
    noise_cancelling: false,
  },
  {
    brand: "MilLink",
    name: "Mi Tune03",
    price: 3980,
    category: "完全ワイヤレス",
    noise_cancelling: false,
  },
  {
    brand: "Gracevally",
    name: "GRACE X1",
    price: 2780,
    category: "完全ワイヤレス",
    noise_cancelling: false,
  },
];

function toEarphone(row: FixtureRow, index: number): Earphone {
  return {
    id: `fixture-${index}-${row.brand}-${row.name}`.replace(/\s+/g, "-"),
    name: row.name,
    brand: row.brand,
    price: row.price,
    url: null,
    rakuten_url: null,
    rakuten_price: null,
    rakuten_updated_at: null,
    yahoo_url: null,
    yahoo_price: null,
    yahoo_updated_at: null,
    image_url: null,
    category: row.category,
    noise_cancelling: row.noise_cancelling,
    battery_life: null,
    water_resistance: row.water_resistance ?? null,
    description: null,
    long_description: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

const CATALOG: Earphone[] = FIXTURE_ROWS.map(toEarphone);

const BUDGETS: BudgetPreference[] = [
  "under_4000",
  "under_10000",
  "under_30000",
  "no_limit",
];
const CONNECTIONS: ConnectionPreference[] = ["wired", "wireless", "any"];
const NC_FLAGS: Array<{ nc: NcPreference; label: string }> = [
  { nc: "required", label: "nc_required" },
  { nc: "none", label: "nc_not_required" },
];
const WATER_FLAGS: WaterPreference[] = ["needed", "not_needed"];

function baseAnswers(
  partial: Pick<QuizAnswers, "budget" | "connection" | "nc" | "water">,
): QuizAnswers {
  return {
    scene: "commute",
    priorities: ["sound"],
    ...partial,
  };
}

type ComboResult = {
  key: string;
  budget: BudgetPreference;
  connection: ConnectionPreference;
  nc: NcPreference;
  water: WaterPreference;
  count: number;
  maxPrice: number | null;
  relaxedBudget: boolean;
  names: string[];
};

function runAllCombos(catalog: Earphone[]): ComboResult[] {
  const out: ComboResult[] = [];
  for (const budget of BUDGETS) {
    for (const connection of CONNECTIONS) {
      for (const { nc, label: ncLabel } of NC_FLAGS) {
        for (const water of WATER_FLAGS) {
          const answers = baseAnswers({ budget, connection, nc, water });
          const result = recommendEarphones(catalog, answers, catalog.length);
          const prices = result.items
            .map((item) => item.earphone.price)
            .filter((p): p is number => p != null);
          out.push({
            key: `${budget}|${connection}|${ncLabel}|water_${water}`,
            budget,
            connection,
            nc,
            water,
            count: result.items.length,
            maxPrice: prices.length > 0 ? Math.max(...prices) : null,
            relaxedBudget: result.relaxedFilters.some(
              (f) => f.ja === "予算" || f.en === "Budget",
            ),
            names: result.items.map(
              (item) => `${item.earphone.brand} ${item.earphone.name}`,
            ),
          });
        }
      }
    }
  }
  return out;
}

describe("recommendEarphones low-price catalog simulation", () => {
  const combos = runAllCombos(CATALOG);

  it("covers all budget × connection × nc × water combinations (48)", () => {
    assert.equal(combos.length, 4 * 3 * 2 * 2);
  });

  it("never returns zero matches for any combination", () => {
    const empty = combos.filter((c) => c.count === 0);
    assert.deepEqual(
      empty.map((c) => c.key),
      [],
      `empty combinations: ${empty.map((c) => c.key).join(", ")}`,
    );
  });

  it("keeps under_4000 results within ¥4,000", () => {
    const lowBudget = combos.filter((c) => c.budget === "under_4000");
    for (const combo of lowBudget) {
      assert.ok(
        combo.maxPrice != null && combo.maxPrice <= 4000,
        `${combo.key} maxPrice=${combo.maxPrice} names=${combo.names.join(", ")}`,
      );
      assert.equal(
        combo.relaxedBudget,
        false,
        `${combo.key} should not relax budget when in-budget matches exist`,
      );
    }
  });

  it("preserves existing budget ceilings", () => {
    assert.equal(budgetMax("under_4000"), 4000);
    assert.equal(budgetMax("under_10000"), 10000);
    assert.equal(budgetMax("under_30000"), 30000);
    assert.equal(budgetMax("no_limit"), null);
  });

  it("does not surface expensive models first when under_4000 relaxes NC/water", () => {
    const expensive = toEarphone(
      {
        brand: "Sony",
        name: "WF-1000XM5",
        price: 39800,
        category: "完全ワイヤレス",
        noise_cancelling: true,
        water_resistance: "IPX4",
      },
      99,
    );
    const catalog = [...CATALOG, expensive];
    const result = recommendEarphones(
      catalog,
      baseAnswers({
        budget: "under_4000",
        connection: "wireless",
        nc: "required",
        water: "needed",
      }),
      catalog.length,
    );

    assert.ok(result.items.length > 0);
    assert.ok(
      result.items.every(
        (item) => item.earphone.price != null && item.earphone.price <= 4000,
      ),
    );
    assert.ok(
      !result.items.some((item) => item.earphone.id === expensive.id),
    );
    assert.ok(
      !result.relaxedFilters.some(
        (f) => f.ja === "予算" || f.en === "Budget",
      ),
    );
  });

  it("reports combinations with fewer than 3 results", () => {
    const sparse = combos
      .filter((c) => c.count < 3)
      .map((c) => ({ key: c.key, count: c.count, names: c.names }));
    console.log(
      "SPARSE_COMBOS(<3):\n" +
        (sparse.length === 0
          ? "(none)"
          : sparse
              .map(
                (s) =>
                  `- ${s.key}: ${s.count}件 → ${s.names.join(" / ") || "(empty)"}`,
              )
              .join("\n")),
    );
    assert.ok(Array.isArray(sparse));
  });
});
