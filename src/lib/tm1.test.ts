import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOpenArticleListMessage, isEmbeddedInIframe } from "./tm1.ts";

test("builds the exact TM1 openArticleList payload shape", () => {
  const message = buildOpenArticleListMessage("CP1003290");
  assert.deepEqual(JSON.parse(message), {
    openArticleList: {
      direct: { query: "CP1003290" },
      inModal: true,
      useNewModal: true,
    },
  });
});

test("isEmbeddedInIframe returns false when window is unavailable", () => {
  assert.equal(isEmbeddedInIframe(), false);
});
