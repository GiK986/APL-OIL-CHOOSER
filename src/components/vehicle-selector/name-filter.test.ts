import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesNameFilter } from "./name-filter.ts";

test("empty query matches everything", () => {
  assert.equal(matchesNameFilter("Audi", ""), true);
});

test("whitespace-only query matches everything", () => {
  assert.equal(matchesNameFilter("Audi", "   "), true);
});

test("matches a case-insensitive substring", () => {
  assert.equal(matchesNameFilter("Audi", "aud"), true);
  assert.equal(matchesNameFilter("Audi", "AUD"), true);
});

test("does not match an unrelated query", () => {
  assert.equal(matchesNameFilter("Audi", "bmw"), false);
});

test("matches a substring in the middle of the name", () => {
  assert.equal(matchesNameFilter("Mercedes-Benz", "benz"), true);
});
