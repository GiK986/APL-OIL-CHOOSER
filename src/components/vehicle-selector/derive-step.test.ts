import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveStep } from "./derive-step.ts";

test("shows category grid when nothing selected", () => {
  assert.equal(
    deriveStep({
      hasCategory: false,
      hasMake: false,
      hasModel: false,
      hasType: false,
      showCategoryGrid: false,
    }),
    "category",
  );
});

test("shows make grid once a category is selected", () => {
  assert.equal(
    deriveStep({
      hasCategory: true,
      hasMake: false,
      hasModel: false,
      hasType: false,
      showCategoryGrid: false,
    }),
    "make",
  );
});

test("shows model grid once make is selected", () => {
  assert.equal(
    deriveStep({
      hasCategory: true,
      hasMake: true,
      hasModel: false,
      hasType: false,
      showCategoryGrid: false,
    }),
    "model",
  );
});

test("shows type table once model is selected", () => {
  assert.equal(
    deriveStep({
      hasCategory: true,
      hasMake: true,
      hasModel: true,
      hasType: false,
      showCategoryGrid: false,
    }),
    "type",
  );
});

test("shows results once a type is selected", () => {
  assert.equal(
    deriveStep({
      hasCategory: true,
      hasMake: true,
      hasModel: true,
      hasType: true,
      showCategoryGrid: false,
    }),
    "results",
  );
});

test("a type selection shows results even without category/make/model (e.g. via search)", () => {
  assert.equal(
    deriveStep({
      hasCategory: false,
      hasMake: false,
      hasModel: false,
      hasType: true,
      showCategoryGrid: false,
    }),
    "results",
  );
});

test("showCategoryGrid forces the category step even if a category is already selected", () => {
  assert.equal(
    deriveStep({
      hasCategory: true,
      hasMake: true,
      hasModel: true,
      hasType: false,
      showCategoryGrid: true,
    }),
    "category",
  );
});
