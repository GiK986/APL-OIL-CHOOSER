// src/lib/olyslager/brand.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { BRANDS, DEFAULT_BRAND, ENABLED_BRANDS, parseBrand } from "./brand.ts";

test("BRANDS lists every configured brand; only eurol is enabled and it is the default", () => {
  assert.deepEqual([...BRANDS], ["fuchs", "eurol"]);
  assert.deepEqual([...ENABLED_BRANDS], ["eurol"]);
  assert.equal(DEFAULT_BRAND, "eurol");
});

test("parseBrand accepts an enabled brand id", () => {
  assert.equal(parseBrand("eurol"), "eurol");
});

test("parseBrand rejects fuchs while it is disabled", () => {
  assert.equal(parseBrand("fuchs"), null);
});

test("parseBrand rejects other casing, unknown ids and non-strings", () => {
  for (const value of ["Eurol", "EUROL", " eurol", "", "total", null, undefined, 1, {}, ["eurol"]]) {
    assert.equal(parseBrand(value), null, `expected null for ${JSON.stringify(value)}`);
  }
});
