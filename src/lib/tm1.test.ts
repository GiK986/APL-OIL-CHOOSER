import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenArticleListMessage,
  isEmbeddedInIframe,
  openArticleList,
} from "./tm1.ts";

test("Fuchs searches by utility number (searchFilter 4)", () => {
  const message = buildOpenArticleListMessage("CP1003290", "fuchs");
  assert.deepEqual(JSON.parse(message), {
    openArticleList: {
      direct: { query: "CP1003290", searchFilter: 4 },
      inModal: true,
      useNewModal: true,
    },
  });
});

test("Eurol searches by manufacturer part number (searchFilter 1)", () => {
  const message = buildOpenArticleListMessage("E100016", "eurol");
  assert.deepEqual(JSON.parse(message), {
    openArticleList: {
      direct: { query: "E100016", searchFilter: 1 },
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
    openArticleList("E1", "eurol");
    assert.equal(posts.length, 1);
    assert.equal(posts[0][1], "https://tm-next.dvse.de");
    assert.equal(posts[0][0], buildOpenArticleListMessage("E1", "eurol"));
  });
});

test("openArticleList falls back to document.referrer", () => {
  withFakeWindow({ referrer: "https://tm1.carparts-cat.com/some/path?x=1" }, (posts) => {
    openArticleList("CP1", "fuchs");
    assert.deepEqual(posts.map((p) => p[1]), ["https://tm1.carparts-cat.com"]);
  });
});

test("openArticleList does not post to an unknown origin", () => {
  withFakeWindow({ ancestorOrigins: ["https://evil.example"] }, (posts) => {
    openArticleList("CP1", "fuchs");
    assert.equal(posts.length, 0);
  });
});
