// src/lib/olyslager/brand-config.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BASE_URL, resolveOlyslagerConfig } from "./brand-config.ts";

const FULL_ENV = {
  OLYSLAGER_BASE_URL: "https://example.test/rest/",
  OLYSLAGER_FUCHS_DATASET: "fuchs_eu",
  OLYSLAGER_FUCHS_SUBSCRIPTION_KEY: "fuchs-key",
  OLYSLAGER_EUROL_DATASET: "eurol-auto-plus",
  OLYSLAGER_EUROL_SUBSCRIPTION_KEY: "eurol-key",
};

test("resolves each brand to its own dataset and key with the shared base URL", () => {
  assert.deepEqual(resolveOlyslagerConfig("fuchs", FULL_ENV), {
    baseUrl: "https://example.test/rest/",
    dataset: "fuchs_eu",
    subscriptionKey: "fuchs-key",
  });
  assert.deepEqual(resolveOlyslagerConfig("eurol", FULL_ENV), {
    baseUrl: "https://example.test/rest/",
    dataset: "eurol-auto-plus",
    subscriptionKey: "eurol-key",
  });
});

test("falls back to the default base URL when unset or empty", () => {
  assert.equal(resolveOlyslagerConfig("fuchs", { ...FULL_ENV, OLYSLAGER_BASE_URL: undefined }).baseUrl, DEFAULT_BASE_URL);
  assert.equal(resolveOlyslagerConfig("fuchs", { ...FULL_ENV, OLYSLAGER_BASE_URL: "" }).baseUrl, DEFAULT_BASE_URL);
  assert.equal(DEFAULT_BASE_URL, "https://api.olyslager.com/rest/");
});

test("a missing Eurol key only breaks Eurol and names the exact variable", () => {
  const env = { ...FULL_ENV, OLYSLAGER_EUROL_SUBSCRIPTION_KEY: undefined };
  assert.equal(resolveOlyslagerConfig("fuchs", env).subscriptionKey, "fuchs-key");
  assert.throws(() => resolveOlyslagerConfig("eurol", env), {
    message: "OLYSLAGER_EUROL_SUBSCRIPTION_KEY is not set",
  });
});

test("a missing or empty dataset throws instead of falling back to another dataset", () => {
  assert.throws(() => resolveOlyslagerConfig("eurol", { ...FULL_ENV, OLYSLAGER_EUROL_DATASET: undefined }), {
    message: "OLYSLAGER_EUROL_DATASET is not set",
  });
  assert.throws(() => resolveOlyslagerConfig("fuchs", { ...FULL_ENV, OLYSLAGER_FUCHS_DATASET: "" }), {
    message: "OLYSLAGER_FUCHS_DATASET is not set",
  });
});

test("an empty key is treated as missing", () => {
  assert.throws(() => resolveOlyslagerConfig("fuchs", { ...FULL_ENV, OLYSLAGER_FUCHS_SUBSCRIPTION_KEY: "" }), {
    message: "OLYSLAGER_FUCHS_SUBSCRIPTION_KEY is not set",
  });
});
