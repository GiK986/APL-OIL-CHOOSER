import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveStep } from "./derive-step.ts";

test("shows make grid when nothing selected", () => {
  assert.equal(
    deriveStep({ hasMake: false, hasModel: false, hasType: false }),
    "make",
  );
});

test("shows model grid once make is selected", () => {
  assert.equal(
    deriveStep({ hasMake: true, hasModel: false, hasType: false }),
    "model",
  );
});

test("shows type table once model is selected", () => {
  assert.equal(
    deriveStep({ hasMake: true, hasModel: true, hasType: false }),
    "type",
  );
});

test("shows results once a type is selected", () => {
  assert.equal(
    deriveStep({ hasMake: true, hasModel: true, hasType: true }),
    "results",
  );
});

test("a type selection shows results even without make/model (e.g. via search)", () => {
  assert.equal(
    deriveStep({ hasMake: false, hasModel: false, hasType: true }),
    "results",
  );
});
