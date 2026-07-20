export interface MatchSegment {
  text: string;
  matched: boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitOnMatch(text: string, query: string): MatchSegment[] {
  // Longest-first so a token that's a substring of another (e.g. "2" vs "2.0")
  // never pre-empts the more specific match at the same starting position.
  const tokens = Array.from(new Set(query.trim().split(/\s+/).filter(Boolean))).sort(
    (a, b) => b.length - a.length,
  );

  if (tokens.length === 0) {
    return [{ text, matched: false }];
  }

  const pattern = new RegExp(tokens.map(escapeRegExp).join("|"), "gi");
  const segments: MatchSegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({ text: text.slice(cursor, match.index), matched: false });
    }
    segments.push({ text: match[0], matched: true });
    cursor = match.index + match[0].length;
  }

  if (segments.length === 0) {
    return [{ text, matched: false }];
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }

  return segments;
}
