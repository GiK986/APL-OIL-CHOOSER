import { test } from "node:test";
import assert from "node:assert/strict";
import { groupProductsByUse } from "./group-products-by-use.ts";
import type { ProductRecommendation } from "@/lib/olyslager/types";

function makeProduct(overrides: Partial<ProductRecommendation> = {}): ProductRecommendation {
  return {
    productAppOrder: 1,
    productName: "Test Product",
    productCode: null,
    temperatureName: null,
    useAppOrder: 1,
    useName: "Normal",
    intervals: [{ appOrder: 1, intervalName: "15000 km/ 12 months", intervalType: "Change" }],
    approvalClassifications: null,
    ...overrides,
  };
}

test("groups products by useName", () => {
  const products = [
    makeProduct({ productName: "A", useName: "Normal", useAppOrder: 1 }),
    makeProduct({ productName: "B", useName: "Extended drain (max)", useAppOrder: 3511 }),
    makeProduct({ productName: "C", useName: "Normal", useAppOrder: 1 }),
  ];
  const groups = groupProductsByUse(products);
  assert.equal(groups.length, 2);
  const normal = groups.find((g) => g.useName === "Normal")!;
  assert.deepEqual(normal.products.map((p) => p.productName), ["A", "C"]);
});

test("orders groups by useAppOrder ascending", () => {
  const products = [
    makeProduct({ productName: "A", useName: "Extended drain (max)", useAppOrder: 3511 }),
    makeProduct({ productName: "B", useName: "Normal", useAppOrder: 1 }),
  ];
  const groups = groupProductsByUse(products);
  assert.deepEqual(groups.map((g) => g.useName), ["Normal", "Extended drain (max)"]);
});

test("preserves incoming product order within a group", () => {
  const products = [
    makeProduct({ productName: "First", useName: "Normal", useAppOrder: 1 }),
    makeProduct({ productName: "Second", useName: "Normal", useAppOrder: 1 }),
    makeProduct({ productName: "Third", useName: "Normal", useAppOrder: 1 }),
  ];
  const groups = groupProductsByUse(products);
  assert.deepEqual(groups[0].products.map((p) => p.productName), ["First", "Second", "Third"]);
});

test("takes the group's intervals from its first product", () => {
  const intervalsA = [{ appOrder: 1, intervalName: "30000 km/ 24 months", intervalType: "Change" }];
  const products = [
    makeProduct({ productName: "A", useName: "Extended drain (max)", useAppOrder: 3511, intervals: intervalsA }),
    makeProduct({ productName: "B", useName: "Extended drain (max)", useAppOrder: 3511, intervals: [] }),
  ];
  const groups = groupProductsByUse(products);
  assert.deepEqual(groups[0].intervals, intervalsA);
});

test("groups a null useName under the literal string \"Normal\"", () => {
  const products = [makeProduct({ productName: "A", useName: null, useAppOrder: 1 })];
  const groups = groupProductsByUse(products);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].useName, "Normal");
});

test("returns an empty array for an empty input", () => {
  assert.deepEqual(groupProductsByUse([]), []);
});
