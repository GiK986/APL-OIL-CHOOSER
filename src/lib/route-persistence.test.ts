// src/lib/route-persistence.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStorageKey, hasAppState, readPersistedPath, writePersistedPath } from "./route-persistence.ts";

function installFakeSessionStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
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

test("buildStorageKey returns the shared key when tid is null", () => {
  assert.equal(buildStorageKey(null), "apl-oil-chooser:last-path");
});

test("buildStorageKey namespaces the key by tid when present", () => {
  assert.equal(buildStorageKey("task-42"), "apl-oil-chooser:last-path:task-42");
});

test("readPersistedPath returns null when nothing stored", () => {
  installFakeSessionStorage();
  assert.equal(readPersistedPath(buildStorageKey(null)), null);
});

test("writePersistedPath then readPersistedPath round-trips the value", () => {
  installFakeSessionStorage();
  const key = buildStorageKey("task-1");
  writePersistedPath(key, "/vehicle/make/bmw");
  assert.equal(readPersistedPath(key), "/vehicle/make/bmw");
});

test("paths written under different tid keys do not collide", () => {
  installFakeSessionStorage();
  const keyA = buildStorageKey("task-1");
  const keyB = buildStorageKey("task-2");
  writePersistedPath(keyA, "/vehicle/make/bmw");
  writePersistedPath(keyB, "/vehicle/make/audi");
  assert.equal(readPersistedPath(keyA), "/vehicle/make/bmw");
  assert.equal(readPersistedPath(keyB), "/vehicle/make/audi");
});

test("readPersistedPath returns null when sessionStorage is unavailable", () => {
  delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  assert.equal(readPersistedPath(buildStorageKey(null)), null);
});

test("writePersistedPath does not throw when sessionStorage is unavailable", () => {
  delete (globalThis as { sessionStorage?: Storage }).sessionStorage;
  assert.doesNotThrow(() => writePersistedPath(buildStorageKey(null), "/foo"));
});

test("hasAppState is false for a bare entry URL with no params", () => {
  assert.equal(hasAppState(new URLSearchParams("")), false);
});

test("hasAppState is false when only TM1's own control params are present", () => {
  assert.equal(hasAppState(new URLSearchParams("lid=4&sid=abc&tid=task-1")), false);
});

test("hasAppState is true when the URL carries app state alongside TM1 params", () => {
  assert.equal(hasAppState(new URLSearchParams("lid=4&tid=task-1&categoryId=1")), true);
});
