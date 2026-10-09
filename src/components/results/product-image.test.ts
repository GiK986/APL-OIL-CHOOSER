// src/components/results/product-image.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getFallbackImage, initialImageSrc } from "./product-image.ts";

test("each brand has its own placeholder", () => {
  assert.equal(getFallbackImage("fuchs"), "/products/fuchs-no-image.jpg");
  assert.equal(getFallbackImage("eurol"), "/products/eurol-no-image.png");
});

test("an API productImage wins over everything", () => {
  assert.equal(
    initialImageSrc({ productImage: "https://cdn.test/p.png", productCode: "E504149" }, "eurol"),
    "https://cdn.test/p.png",
  );
});

test("otherwise the local photo named after productCode is tried", () => {
  assert.equal(initialImageSrc({ productImage: "", productCode: "CP1003290" }, "fuchs"), "/products/CP1003290.jpg");
  assert.equal(initialImageSrc({ productImage: null, productCode: "E504149" }, "eurol"), "/products/E504149.jpg");
});

test("with neither, the selected brand's placeholder is used", () => {
  assert.equal(initialImageSrc({ productImage: "", productCode: null }, "fuchs"), "/products/fuchs-no-image.jpg");
  assert.equal(initialImageSrc({ productImage: null, productCode: null }, "eurol"), "/products/eurol-no-image.png");
});

test("Eurol records omit the fields entirely (undefined) and still get the Eurol placeholder", () => {
  const eurolRecord = {} as { productImage: string | null; productCode: string | null };
  assert.equal(initialImageSrc(eurolRecord, "eurol"), "/products/eurol-no-image.png");
});
