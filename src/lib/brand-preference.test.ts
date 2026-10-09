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

test("defaults to fuchs when nothing is stored", () => {
  assert.equal(getBrandPreference(), "fuchs");
});

test("round-trips eurol under the documented key", () => {
  setBrandPreference("eurol");
  assert.equal(localStorage.getItem(BRAND_STORAGE_KEY), "eurol");
  assert.equal(BRAND_STORAGE_KEY, "apl-oil-chooser:brand");
  assert.equal(getBrandPreference(), "eurol");
  setBrandPreference("fuchs");
  assert.equal(getBrandPreference(), "fuchs");
});

test("falls back to fuchs for garbage or differently-cased stored values", () => {
  for (const value of ["EUROL", "Eurol", "total", "", '"eurol"']) {
    localStorage.setItem(BRAND_STORAGE_KEY, value);
    assert.equal(getBrandPreference(), "fuchs", `expected fuchs for ${JSON.stringify(value)}`);
  }
});

test("falls back to fuchs when getItem throws", () => {
  localStorage.getItem = () => {
    throw new Error("SecurityError");
  };
  assert.equal(getBrandPreference(), "fuchs");
});

test("swallows setItem errors", () => {
  localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.doesNotThrow(() => setBrandPreference("eurol"));
});

test("works when localStorage is undefined (server render)", () => {
  delete (globalThis as { localStorage?: Storage }).localStorage;
  assert.equal(getBrandPreference(), "fuchs");
  assert.doesNotThrow(() => setBrandPreference("eurol"));
});
