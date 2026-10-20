// src/components/results/disclaimer-segments.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDisclaimer } from "./disclaimer-segments.ts";

test("splits the real Olyslager disclaimer into text and an https link", () => {
  const html =
    "© <a href='https://www.olyslager.com/'>Olyslager</a> 2026 All rights reserved. No part of this information may be reproduced.";
  assert.deepEqual(parseDisclaimer(html), [
    { type: "text", text: "© " },
    { type: "link", href: "https://www.olyslager.com/", text: "Olyslager" },
    { type: "text", text: " 2026 All rights reserved. No part of this information may be reproduced." },
  ]);
});

test("accepts double-quoted hrefs and extra attributes", () => {
  assert.deepEqual(parseDisclaimer('See <a class="x" href="https://example.com/a?b=1">here</a>.'), [
    { type: "text", text: "See " },
    { type: "link", href: "https://example.com/a?b=1", text: "here" },
    { type: "text", text: "." },
  ]);
});

test("non-https links are kept as plain text, never as a link", () => {
  for (const href of ["javascript:alert(1)", "http://olyslager.com/", "//evil.example", "/relative"]) {
    assert.deepEqual(parseDisclaimer(`a <a href='${href}'>b</a> c`), [{ type: "text", text: "a b c" }], href);
  }
});

test("other tags are stripped, keeping their text", () => {
  assert.deepEqual(parseDisclaimer("<b>Bold</b> and <script>x()</script><br/>end"), [
    { type: "text", text: "Bold and x()end" },
  ]);
});

test("decodes common HTML entities in text and link labels", () => {
  assert.deepEqual(parseDisclaimer("A &amp; B &lt;C&gt; &quot;D&quot; &#39;E&#39;&nbsp;F"), [
    { type: "text", text: "A & B <C> \"D\" 'E' F" },
  ]);
});

test("empty, null or whitespace-only input yields no segments", () => {
  assert.deepEqual(parseDisclaimer(""), []);
  assert.deepEqual(parseDisclaimer("   "), []);
  assert.deepEqual(parseDisclaimer(null), []);
  assert.deepEqual(parseDisclaimer(undefined), []);
});
