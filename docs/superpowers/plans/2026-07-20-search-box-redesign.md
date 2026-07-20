# Search Box Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the landing-page "search by model" box legible and wider, and redesign its result cards to show a vehicle photo plus a full labeled info grid (engine code, drive type, year, power, fuel, capacity), with the matched query substring bolded in primary color.

**Architecture:** A new pure-logic module (`splitOnMatch`) computes match/non-match text segments; `SearchResultsList` renders those segments as highlighted `<span>`s inside a redesigned two-column card (photo left, text right); `SearchBox` fixes the input's contrast and forwards its debounced query down to the list for highlighting; `VehicleSelector` widens the box's container.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, `next-intl`, Node's built-in `node --test` + `node:assert/strict` (no external test runner).

## Global Constraints

- Full test suite command: `node --test src/**/*.test.ts` (run from repo root).
- Type check: `npx tsc --noEmit`. Lint: `npm run lint`. Both must be clean before every commit.
- Every user-facing string change must be mirrored in BOTH `src/messages/en.json` and `src/messages/bg.json`, same key, under the `Search` namespace.
- This search box lives in the pre-results navigation area (landing page), not the results page. Per the app's established two-tone convention, its card border stays neutral `border-border` / `bg-card` — the primary red is reserved for the match-highlight text only, not for borders or dividers here.
- Reuse existing UI primitives as-is: `Card` (`src/components/ui/card.tsx`), `Input` (`src/components/ui/input.tsx`), `next/image` for remote Olyslager photo URLs (already whitelisted — `ModelGrid`/`MakeGrid`/`VehicleSidebarCard` already render these same remote URLs successfully, no `next.config` change needed).
- `SearchResult` fields in play (`src/lib/olyslager/types.ts:146-165`): `typeId`, `make`, `model`, `modelCode`, `type`, `typeCode`, `yearStart`, `yearEnd`, `fuel`, `driveType`, `cilinderCapacity` (note: upstream spelling, not "cylinder"), `powerHp`, `powerKw`, `engineCode`, `modelImageUrlSmall/Medium/Large`. All of `powerHp`/`powerKw`/`cilinderCapacity`/`engineCode`/`fuel`/`driveType`/`modelCode`/`typeCode` are `string | null`.

---

### Task 1: `splitOnMatch` highlight-matching utility

**Files:**
- Create: `src/components/search/highlight-match.ts`
- Test: `src/components/search/highlight-match.test.ts`

**Interfaces:**
- Produces: `interface MatchSegment { text: string; matched: boolean }` and `function splitOnMatch(text: string, query: string): MatchSegment[]` — case-insensitive substring search; returns the text as a single unmatched segment when the (trimmed) query is empty or not found; splits into alternating matched/unmatched segments otherwise, preserving the original casing of `text` in every segment.

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitOnMatch } from "./highlight-match.ts";

test("empty query returns the text as one unmatched segment", () => {
  assert.deepEqual(splitOnMatch("Audi A6", ""), [{ text: "Audi A6", matched: false }]);
});

test("whitespace-only query returns the text as one unmatched segment", () => {
  assert.deepEqual(splitOnMatch("Audi A6", "   "), [{ text: "Audi A6", matched: false }]);
});

test("no match returns the text as one unmatched segment", () => {
  assert.deepEqual(splitOnMatch("Audi A6", "bmw"), [{ text: "Audi A6", matched: false }]);
});

test("match in the middle splits into three segments", () => {
  assert.deepEqual(splitOnMatch("Audi A6 2.0", "A6"), [
    { text: "Audi ", matched: false },
    { text: "A6", matched: true },
    { text: " 2.0", matched: false },
  ]);
});

test("match is case-insensitive but preserves original casing in output", () => {
  assert.deepEqual(splitOnMatch("Audi A6", "audi"), [
    { text: "Audi", matched: true },
    { text: " A6", matched: false },
  ]);
});

test("match at the very start has no leading unmatched segment", () => {
  assert.deepEqual(splitOnMatch("A6 2.0", "A6"), [
    { text: "A6", matched: true },
    { text: " 2.0", matched: false },
  ]);
});

test("match at the very end has no trailing unmatched segment", () => {
  assert.deepEqual(splitOnMatch("2.0 A6", "A6"), [
    { text: "2.0 ", matched: false },
    { text: "A6", matched: true },
  ]);
});

test("multiple non-overlapping occurrences all match", () => {
  assert.deepEqual(splitOnMatch("A6 quattro A6", "A6"), [
    { text: "A6", matched: true },
    { text: " quattro ", matched: false },
    { text: "A6", matched: true },
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test src/components/search/highlight-match.test.ts`
Expected: FAIL — `Cannot find module './highlight-match.ts'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test src/components/search/highlight-match.test.ts`
Expected: PASS — 8/8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/search/highlight-match.ts src/components/search/highlight-match.test.ts
git commit -m "feat: add splitOnMatch utility for search-result highlighting"
```

---

### Task 2: Redesign `SearchResultsList` cards

**Files:**
- Modify: `src/components/search/search-results-list.tsx`
- Modify: `src/messages/en.json` (add keys to the `Search` namespace)
- Modify: `src/messages/bg.json` (add keys to the `Search` namespace)

**Interfaces:**
- Consumes: `splitOnMatch`, `MatchSegment` from `./highlight-match` (Task 1).
- Consumes `SearchResult` fields listed in Global Constraints.
- Produces: `SearchResultsListProps` gains an optional `query?: string` prop (default `""`). Not yet supplied by any caller — `SearchBox` still compiles unchanged because the prop is optional, and the component renders exactly as before (no highlighting) until Task 3 passes a real value.

- [ ] **Step 1: Add the new `Search` i18n keys**

In `src/messages/en.json`, replace the `Search` block:

```json
  "Search": {
    "placeholder": "Search by model, e.g. A6 2.0 130",
    "noResults": "No matches — try a different search",
    "engineCodeLabel": "Engine code",
    "driveTypeLabel": "Drive type",
    "yearOfProductionLabel": "Year of production",
    "powerLabel": "Power",
    "fuelLabel": "Fuel",
    "capacityLabel": "Capacity"
  },
```

In `src/messages/bg.json`, replace the `Search` block:

```json
  "Search": {
    "placeholder": "Търсене по модел, напр. A6 2.0 130",
    "noResults": "Няма намерени резултати — опитайте друго търсене",
    "engineCodeLabel": "Код на двигателя",
    "driveTypeLabel": "Задвижване",
    "yearOfProductionLabel": "Година на производство",
    "powerLabel": "Мощност",
    "fuelLabel": "Гориво",
    "capacityLabel": "Обем"
  },
```

- [ ] **Step 2: Rewrite `search-results-list.tsx`**

Replace the full file content:

```tsx
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { splitOnMatch } from "./highlight-match";
import type { SearchResult } from "@/lib/olyslager/types";

interface SearchResultsListProps {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  query?: string;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitOnMatch(text, query).map((segment, index) =>
        segment.matched ? (
          <span key={index} className="font-semibold text-primary">
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </>
  );
}

export function SearchResultsList({ results, onSelect, query = "" }: SearchResultsListProps) {
  const t = useTranslations("Search");

  if (results.length === 0) {
    return <p className="mt-3 text-center text-sm text-muted-foreground">{t("noResults")}</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {results.map((result) => (
        <li key={result.typeId}>
          <button type="button" className="w-full text-left" onClick={() => onSelect(result)}>
            <Card className="flex flex-row items-start gap-3 px-4 py-3 transition-colors hover:bg-muted">
              {result.modelImageUrlMedium && (
                <Image
                  src={result.modelImageUrlMedium}
                  alt=""
                  width={96}
                  height={64}
                  className="h-16 w-24 shrink-0 object-contain"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div>
                  <p className="truncate font-medium">
                    <HighlightedText text={result.make} query={query} />{" "}
                    <HighlightedText text={result.model} query={query} />
                    {result.modelCode && (
                      <>
                        {" ("}
                        <HighlightedText text={result.modelCode} query={query} />
                        {")"}
                      </>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    <HighlightedText text={result.type} query={query} />
                    {result.typeCode && (
                      <>
                        {" ("}
                        <HighlightedText text={result.typeCode} query={query} />
                        {")"}
                      </>
                    )}
                  </p>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                  {result.engineCode && (
                    <>
                      <dt className="text-muted-foreground">{t("engineCodeLabel")}</dt>
                      <dd>{result.engineCode}</dd>
                    </>
                  )}
                  {result.driveType && (
                    <>
                      <dt className="text-muted-foreground">{t("driveTypeLabel")}</dt>
                      <dd>{result.driveType}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">{t("yearOfProductionLabel")}</dt>
                  <dd>
                    {result.yearStart}
                    {result.yearEnd ? `–${result.yearEnd}` : "+"}
                  </dd>
                  {result.powerHp && (
                    <>
                      <dt className="text-muted-foreground">{t("powerLabel")}</dt>
                      <dd>
                        {result.powerHp} HP / {result.powerKw} kW
                      </dd>
                    </>
                  )}
                  {result.fuel && (
                    <>
                      <dt className="text-muted-foreground">{t("fuelLabel")}</dt>
                      <dd>{result.fuel}</dd>
                    </>
                  )}
                  {result.cilinderCapacity && (
                    <>
                      <dt className="text-muted-foreground">{t("capacityLabel")}</dt>
                      <dd>{result.cilinderCapacity}</dd>
                    </>
                  )}
                </dl>
              </div>
            </Card>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean (no errors). `Badge` import was dropped since the drive-type badge no longer exists — confirm no unused-import lint error.

- [ ] **Step 4: Commit**

```bash
git add src/components/search/search-results-list.tsx src/messages/en.json src/messages/bg.json
git commit -m "feat: redesign search result cards with photo, info grid and match highlighting"
```

---

### Task 3: Fix input contrast/width and wire the query into the results list

**Files:**
- Modify: `src/components/search/search-box.tsx`
- Modify: `src/components/vehicle-selector/vehicle-selector.tsx`

**Interfaces:**
- Consumes: `SearchResultsListProps.query` (Task 2) — this task is what finally supplies a real value, completing the highlighting feature end-to-end.

- [ ] **Step 1: Fix the input's contrast and pass the query down**

In `src/components/search/search-box.tsx`, change the `<Input>` and `<SearchResultsList>` JSX:

```tsx
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("placeholder")}
        className="bg-card"
      />
      {debouncedQuery && loading && (
        <p className="absolute z-10 mt-1 w-full rounded-[3px] border border-border bg-card p-3 text-center text-sm text-muted-foreground shadow-md">
          …
        </p>
      )}
      {debouncedQuery && !loading && (
        <div className="absolute z-10 mt-1 max-h-96 w-full overflow-y-auto rounded-[3px] border border-border bg-card shadow-md">
          <SearchResultsList results={results} onSelect={handleSelect} query={debouncedQuery} />
        </div>
      )}
```

(Only the `className="bg-card"` line on `<Input>` and the `query={debouncedQuery}` prop on `<SearchResultsList>` are new; everything else in this block is unchanged.)

- [ ] **Step 2: Widen the search box container**

In `src/components/vehicle-selector/vehicle-selector.tsx`, change:

```tsx
        <div className="w-full md:ml-auto md:max-w-xs">
          <SearchBox onSelectResult={selectSearchResult} />
        </div>
```

to:

```tsx
        <div className="w-full md:ml-auto md:max-w-md">
          <SearchBox onSelectResult={selectSearchResult} />
        </div>
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint && node --test src/**/*.test.ts`
Expected: tsc/lint clean; full test suite passes (9/9: the 8 new `splitOnMatch` tests plus all pre-existing tests).

Then start the dev server and manually check in a browser: the search input on the landing page has a visible, opaque background and is noticeably wider; typing a query (e.g. "A6") shows result cards with a photo, make/model/type/code lines, a full label/value grid, and the "A6" substring bolded in red wherever it appears.

- [ ] **Step 4: Commit**

```bash
git add src/components/search/search-box.tsx src/components/vehicle-selector/vehicle-selector.tsx
git commit -m "fix: improve search input contrast/width and highlight matched query text"
```
