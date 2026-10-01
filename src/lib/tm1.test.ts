import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenArticleListMessage,
  isEmbeddedInIframe,
  openArticleList,
} from "./tm1.ts";

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

function withFakeWindow(
  opts: { ancestorOrigins?: string[]; referrer?: string },
  run: (posts: Array<[string, string]>) => void,
) {
  const posts: Array<[string, string]> = [];
  const g = globalThis as Record<string, unknown>;
  g.window = {
    location: { ancestorOrigins: opts.ancestorOrigins },
    parent: { postMessage: (msg: string, origin: string) => posts.push([msg, origin]) },
  };
  g.document = { referrer: opts.referrer ?? "" };
  try {
    run(posts);
  } finally {
    delete g.window;
    delete g.document;
  }
}

test("openArticleList posts to the allowed ancestor origin", () => {
  withFakeWindow({ ancestorOrigins: ["https://tm-next.dvse.de"] }, (posts) => {
    openArticleList("CP1");
    assert.equal(posts.length, 1);
    assert.equal(posts[0][1], "https://tm-next.dvse.de");
  });
});

test("openArticleList falls back to document.referrer", () => {
  withFakeWindow({ referrer: "https://tm1.carparts-cat.com/some/path?x=1" }, (posts) => {
    openArticleList("CP1");
    assert.deepEqual(posts.map((p) => p[1]), ["https://tm1.carparts-cat.com"]);
  });
});

test("openArticleList does not post to an unknown origin", () => {
  withFakeWindow({ ancestorOrigins: ["https://evil.example"] }, (posts) => {
    openArticleList("CP1");
    assert.equal(posts.length, 0);
  });
});
