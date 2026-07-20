import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesNameFilter } from "./name-filter.ts";

test("empty query matches everything", () => {
  assert.equal(matchesNameFilter(["Audi"], ""), true);
});

test("whitespace-only query matches everything", () => {
  assert.equal(matchesNameFilter(["Audi"], "   "), true);
});

test("matches a case-insensitive substring", () => {
  assert.equal(matchesNameFilter(["Audi"], "aud"), true);
  assert.equal(matchesNameFilter(["Audi"], "AUD"), true);
});

test("does not match an unrelated query", () => {
  assert.equal(matchesNameFilter(["Audi"], "bmw"), false);
});

test("matches a substring in the middle of the name", () => {
  assert.equal(matchesNameFilter(["Mercedes-Benz"], "benz"), true);
});

test("multi-word query requires every word to appear somewhere across the fields", () => {
  assert.equal(matchesNameFilter(["A6", "4G"], "A6 4G"), true);
});

test("multi-word query fails if any word is missing from every field", () => {
  assert.equal(matchesNameFilter(["A6", "4G"], "A6 8V"), false);
});

test("a query word can match a different field than another word", () => {
  assert.equal(matchesNameFilter(["A6", "4G"], "4g a6"), true);
});

test("null and undefined fields are ignored", () => {
  assert.equal(matchesNameFilter(["A6", null], "A6"), true);
  assert.equal(matchesNameFilter(["A6", null], "4G"), false);
  assert.equal(matchesNameFilter(["A6", undefined], "A6"), true);
});
