import { test } from "node:test";
import assert from "node:assert/strict";
import { splitOnMatch } from "./highlight-match.ts";

test("empty query returns the text as one unmatched segment", () => {
  assert.deepEqual(splitOnMatch("Audi A6", ""), [{ text: "Audi A6", matched: false }]);
});

test("whitespace-only query returns the text as one unmatched segment", () => {
  assert.deepEqual(splitOnMatch("Audi A6", "   "), [{ text: "Audi A6", matched: false }]);
});

test("no match returns the text as one unmatched segment", () => {
  assert.deepEqual(splitOnMatch("Audi A6", "bmw"), [{ text: "Audi A6", matched: false }]);
});

test("match in the middle splits into three segments", () => {
  assert.deepEqual(splitOnMatch("Audi A6 2.0", "A6"), [
    { text: "Audi ", matched: false },
    { text: "A6", matched: true },
    { text: " 2.0", matched: false },
  ]);
});

test("match is case-insensitive but preserves original casing in output", () => {
  assert.deepEqual(splitOnMatch("Audi A6", "audi"), [
    { text: "Audi", matched: true },
    { text: " A6", matched: false },
  ]);
});

test("match at the very start has no leading unmatched segment", () => {
  assert.deepEqual(splitOnMatch("A6 2.0", "A6"), [
    { text: "A6", matched: true },
    { text: " 2.0", matched: false },
  ]);
});

test("match at the very end has no trailing unmatched segment", () => {
  assert.deepEqual(splitOnMatch("2.0 A6", "A6"), [
    { text: "2.0 ", matched: false },
    { text: "A6", matched: true },
  ]);
});

test("multiple non-overlapping occurrences all match", () => {
  assert.deepEqual(splitOnMatch("A6 quattro A6", "A6"), [
    { text: "A6", matched: true },
    { text: " quattro ", matched: false },
    { text: "A6", matched: true },
  ]);
});
