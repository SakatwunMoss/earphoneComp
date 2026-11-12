import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getBrandWordmarkTextClass } from "@/lib/brandWordmark";

describe("getBrandWordmarkTextClass", () => {
  it("短いブランド名は text-lg", () => {
    assert.equal(getBrandWordmarkTextClass("OPPO"), "text-lg");
    assert.equal(getBrandWordmarkTextClass("Final"), "text-lg");
    assert.equal(getBrandWordmarkTextClass("Baseus"), "text-lg");
    assert.equal(getBrandWordmarkTextClass("radius"), "text-lg");
    assert.equal(getBrandWordmarkTextClass("JBL"), "text-lg");
  });

  it("中程度の長さは text-base", () => {
    assert.equal(getBrandWordmarkTextClass("MilLink"), "text-base");
    assert.equal(getBrandWordmarkTextClass("Philips"), "text-base");
  });

  it("長いブランド名は text-sm", () => {
    assert.equal(getBrandWordmarkTextClass("Gracevally"), "text-sm");
    assert.equal(getBrandWordmarkTextClass("Sennheiser"), "text-sm");
    assert.equal(getBrandWordmarkTextClass("VeryLongBrandName"), "text-sm");
  });
});
