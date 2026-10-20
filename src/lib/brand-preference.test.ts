// src/lib/brand-preference.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { BRAND_STORAGE_KEY, getBrandPreference, setBrandPreference } from "./brand-preference.ts";

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

beforeEach(() => {
  installFakeLocalStorage();
});

test("defaults to eurol when nothing is stored", () => {
  assert.equal(getBrandPreference(), "eurol");
});

test("round-trips eurol under the documented key", () => {
  setBrandPreference("eurol");
  assert.equal(localStorage.getItem(BRAND_STORAGE_KEY), "eurol");
  assert.equal(BRAND_STORAGE_KEY, "apl-oil-chooser:brand");
  assert.equal(getBrandPreference(), "eurol");
});

test("a stored fuchs preference falls back to eurol while fuchs is disabled", () => {
  localStorage.setItem(BRAND_STORAGE_KEY, "fuchs");
  assert.equal(getBrandPreference(), "eurol");
});

test("falls back to eurol for garbage or differently-cased stored values", () => {
  for (const value of ["EUROL", "Eurol", "total", "", '"eurol"']) {
    localStorage.setItem(BRAND_STORAGE_KEY, value);
    assert.equal(getBrandPreference(), "eurol", `expected eurol for ${JSON.stringify(value)}`);
  }
});

test("falls back to eurol when getItem throws", () => {
  localStorage.getItem = () => {
    throw new Error("SecurityError");
  };
  assert.equal(getBrandPreference(), "eurol");
});

test("swallows setItem errors", () => {
  localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.doesNotThrow(() => setBrandPreference("eurol"));
});

test("works when localStorage is undefined (server render)", () => {
  delete (globalThis as { localStorage?: Storage }).localStorage;
  assert.equal(getBrandPreference(), "eurol");
  assert.doesNotThrow(() => setBrandPreference("eurol"));
});
