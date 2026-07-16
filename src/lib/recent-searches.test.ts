// src/lib/recent-searches.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getRecentSearches, addRecentSearch, type RecentSearchEntry } from "./recent-searches.ts";

function installFakeLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function makeEntry(overrides: Partial<RecentSearchEntry> = {}): RecentSearchEntry {
  return {
    typeId: 1,
    categoryId: 1,
    categoryName: "Cars",
    makeName: "Audi (EU)",
    modelName: "A6, S6, RS 6",
    typeName: "A6 2.0 TFSI (162 kW)",
    yearStart: 2011,
    yearEnd: 2014,
    ...overrides,
  };
}

beforeEach(() => {
  installFakeLocalStorage();
});

test("getRecentSearches returns an empty array when nothing stored", () => {
  assert.deepEqual(getRecentSearches(), []);
});

test("addRecentSearch persists an entry retrievable via getRecentSearches", () => {
  const entry = makeEntry();
  addRecentSearch(entry);
  assert.deepEqual(getRecentSearches(), [entry]);
});

test("addRecentSearch puts the newest entry first", () => {
  addRecentSearch(makeEntry({ typeId: 1, typeName: "First" }));
  addRecentSearch(makeEntry({ typeId: 2, typeName: "Second" }));
  const all = getRecentSearches();
  assert.equal(all[0].typeName, "Second");
  assert.equal(all[1].typeName, "First");
});

test("addRecentSearch dedupes by typeId, moving the re-added entry to the front", () => {
  addRecentSearch(makeEntry({ typeId: 1, typeName: "First" }));
  addRecentSearch(makeEntry({ typeId: 2, typeName: "Second" }));
  addRecentSearch(makeEntry({ typeId: 1, typeName: "First again" }));
  const all = getRecentSearches();
  assert.equal(all.length, 2);
  assert.equal(all[0].typeName, "First again");
  assert.equal(all[1].typeName, "Second");
});

test("addRecentSearch caps the list at 20 entries", () => {
  for (let i = 0; i < 25; i++) {
    addRecentSearch(makeEntry({ typeId: i, typeName: `Type ${i}` }));
  }
  const all = getRecentSearches();
  assert.equal(all.length, 20);
  assert.equal(all[0].typeName, "Type 24");
});

test("getRecentSearches filters out malformed entries missing a numeric typeId", () => {
  localStorage.setItem(
    "apl-oil-chooser:recent-searches",
    JSON.stringify([makeEntry({ typeId: 1 }), { categoryId: 1 }, makeEntry({ typeId: 2 })]),
  );
  const all = getRecentSearches();
  assert.equal(all.length, 2);
  assert.deepEqual(all.map((e) => e.typeId), [1, 2]);
});

test("getRecentSearches returns an empty array when localStorage is unavailable", () => {
  delete (globalThis as { localStorage?: Storage }).localStorage;
  assert.deepEqual(getRecentSearches(), []);
});
