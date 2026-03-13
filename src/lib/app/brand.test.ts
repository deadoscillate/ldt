import assert from "node:assert/strict";
import test from "node:test";

import { BRAND, buildBrandTitle } from "@/lib/app/brand";

test("brand config exposes Sapio Forge naming", () => {
  assert.equal(BRAND.productName, "Sapio Forge");
  assert.equal(BRAND.studioName, "Sapio Forge Studio");
  assert.equal(BRAND.tagline, "Build learning systems like software.");
  assert.equal(buildBrandTitle("Validation Proof Center"), "Sapio Forge | Validation Proof Center");
});
