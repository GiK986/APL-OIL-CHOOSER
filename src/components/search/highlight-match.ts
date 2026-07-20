export interface MatchSegment {
  text: string;
  matched: boolean;
}

export function splitOnMatch(text: string, query: string): MatchSegment[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [{ text, matched: false }];
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmedQuery.toLowerCase();

  const firstIndex = lowerText.indexOf(lowerQuery);
  if (firstIndex === -1) {
    return [{ text, matched: false }];
  }

  const segments: MatchSegment[] = [];
  let cursor = 0;
  let matchIndex = firstIndex;

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      segments.push({ text: text.slice(cursor, matchIndex), matched: false });
    }
    const matchEnd = matchIndex + trimmedQuery.length;
    segments.push({ text: text.slice(matchIndex, matchEnd), matched: true });
    cursor = matchEnd;
    matchIndex = lowerText.indexOf(lowerQuery, cursor);
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }

  return segments;
}
