import { test } from "node:test";
import assert from "node:assert/strict";
import { extractUseNames, filterComponentsByUseName } from "./product-use-filter.ts";
import type { ProductRecommendation, RecommendationComponent } from "@/lib/olyslager/types";

function makeProduct(overrides: Partial<ProductRecommendation> = {}): ProductRecommendation {
  return {
    productAppOrder: 1,
    productName: "Test Product",
    productCode: null,
    temperatureName: null,
    useAppOrder: 1,
    useName: "Normal",
    intervals: [],
    approvalClassifications: null,
    ...overrides,
  };
}

function makeComponent(overrides: Partial<RecommendationComponent> = {}): RecommendationComponent {
  return {
    id: 1,
    appOrder: 1,
    componentName: "Engine",
    componentCode: null,
    componentCategoryId: null,
    productRecommendations: [],
    capacities: [],
    ...overrides,
  };
}

test("filterComponentsByUseName: null useName returns the same components unfiltered", () => {
  const components = [
    makeComponent({ productRecommendations: [makeProduct({ useName: "Normal" })] }),
  ];
  assert.deepEqual(filterComponentsByUseName(components, null), components);
});

test("filterComponentsByUseName: keeps only products matching the given useName", () => {
  const components = [
    makeComponent({
      productRecommendations: [
        makeProduct({ productName: "A", useName: "Normal" }),
        makeProduct({ productName: "B", useName: "Severe" }),
      ],
    }),
  ];
  const filtered = filterComponentsByUseName(components, "Severe");
  assert.equal(filtered[0].productRecommendations.length, 1);
  assert.equal(filtered[0].productRecommendations[0].productName, "B");
});

test("filterComponentsByUseName: keeps capacities untouched regardless of the filter", () => {
  const components = [
    makeComponent({
      productRecommendations: [makeProduct({ useName: "Normal" })],
      capacities: [{ appOrder: 1, item: "Capacity", value: 5, unit: "liter", condition: null }],
    }),
  ];
  const filtered = filterComponentsByUseName(components, "Severe");
  assert.equal(filtered[0].productRecommendations.length, 0);
  assert.equal(filtered[0].capacities.length, 1);
});

test("extractUseNames: dedupes and sorts across components, skips null", () => {
  const components = [
    makeComponent({ productRecommendations: [makeProduct({ useName: "Severe" })] }),
    makeComponent({
      productRecommendations: [
        makeProduct({ useName: "Normal" }),
        makeProduct({ useName: "Severe" }),
        makeProduct({ useName: null }),
      ],
    }),
  ];
  assert.deepEqual(extractUseNames(components), ["Normal", "Severe"]);
});
