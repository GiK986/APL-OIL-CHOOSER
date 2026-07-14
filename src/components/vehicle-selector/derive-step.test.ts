import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveStep } from "./derive-step.ts";

test("shows category grid when nothing selected", () => {
  assert.equal(
    deriveStep({ hasCategory: false, hasMake: false, hasModel: false, showCategoryGrid: false }),
    "category",
  );
});

test("shows make grid once a category is selected", () => {
  assert.equal(
    deriveStep({ hasCategory: true, hasMake: false, hasModel: false, showCategoryGrid: false }),
    "make",
  );
});

test("shows model grid once make is selected", () => {
  assert.equal(
    deriveStep({ hasCategory: true, hasMake: true, hasModel: false, showCategoryGrid: false }),
    "model",
  );
});

test("shows type table once model is selected", () => {
  assert.equal(
    deriveStep({ hasCategory: true, hasMake: true, hasModel: true, showCategoryGrid: false }),
    "type",
  );
});

test("showCategoryGrid forces the category step even if a category is already selected", () => {
  assert.equal(
    deriveStep({ hasCategory: true, hasMake: true, hasModel: true, showCategoryGrid: true }),
    "category",
  );
});
