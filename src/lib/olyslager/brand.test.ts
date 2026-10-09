// src/lib/olyslager/brand.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { BRANDS, DEFAULT_BRAND, parseBrand } from "./brand.ts";

test("BRANDS lists fuchs then eurol, and fuchs is the default", () => {
  assert.deepEqual([...BRANDS], ["fuchs", "eurol"]);
  assert.equal(DEFAULT_BRAND, "fuchs");
});

test("parseBrand accepts the exact lowercase brand ids", () => {
  assert.equal(parseBrand("fuchs"), "fuchs");
  assert.equal(parseBrand("eurol"), "eurol");
});

test("parseBrand rejects other casing, unknown ids and non-strings", () => {
  for (const value of ["Eurol", "EUROL", " eurol", "", "total", null, undefined, 1, {}, ["eurol"]]) {
    assert.equal(parseBrand(value), null, `expected null for ${JSON.stringify(value)}`);
  }
});
