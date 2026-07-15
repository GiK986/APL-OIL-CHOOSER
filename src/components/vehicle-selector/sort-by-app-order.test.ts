import { test } from "node:test";
import assert from "node:assert/strict";
import { sortByAppOrder } from "./sort-by-app-order.ts";

test("sorts items ascending by appOrder", () => {
  const items = [{ appOrder: 3 }, { appOrder: 1 }, { appOrder: 2 }];
  assert.deepEqual(sortByAppOrder(items).map((i) => i.appOrder), [1, 2, 3]);
});

test("does not mutate the input array", () => {
  const items = [{ appOrder: 2 }, { appOrder: 1 }];
  const sorted = sortByAppOrder(items);
  assert.notEqual(sorted, items);
  assert.deepEqual(items.map((i) => i.appOrder), [2, 1]);
});

test("preserves unrelated fields", () => {
  const items = [
    { appOrder: 2, name: "B" },
    { appOrder: 1, name: "A" },
  ];
  assert.deepEqual(sortByAppOrder(items), [
    { appOrder: 1, name: "A" },
    { appOrder: 2, name: "B" },
  ]);
});
