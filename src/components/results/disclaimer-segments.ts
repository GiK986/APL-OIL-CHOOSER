export type DisclaimerSegment =
  | { type: "text"; text: string }
  | { type: "link"; href: string; text: string };

const ANCHOR = /<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi;
const TAG = /<[^>]*>/g;

const ENTITIES: Array<[RegExp, string]> = [
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, '"'],
  [/&#39;|&apos;/g, "'"],
  [/&nbsp;/g, " "],
  // Last, so "&amp;lt;" becomes the literal "&lt;" rather than "<".
  [/&amp;/g, "&"],
];

function toText(html: string): string {
  let text = html.replace(TAG, "");
  for (const [pattern, char] of ENTITIES) text = text.replace(pattern, char);
  return text;
}

// Olyslager sends its disclaimer as an HTML fragment (a copyright line with an
// <a> to olyslager.com). Rather than injecting that HTML, we keep only https
// links and render everything else as plain text, so nothing it contains can
// execute or navigate the TM1 iframe via javascript: or relative URLs.
export function parseDisclaimer(html: string | null | undefined): DisclaimerSegment[] {
  if (!html || !html.trim()) return [];

  const segments: DisclaimerSegment[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last?.type === "text") last.text += text;
    else segments.push({ type: "text", text });
  };

  let cursor = 0;
  for (const match of html.matchAll(ANCHOR)) {
    pushText(toText(html.slice(cursor, match.index)));
    const href = match[2].trim();
    const label = toText(match[3]);
    if (/^https:\/\//i.test(href) && label) segments.push({ type: "link", href, text: label });
    else pushText(label);
    cursor = match.index + match[0].length;
  }
  pushText(toText(html.slice(cursor)));

  return segments;
}
