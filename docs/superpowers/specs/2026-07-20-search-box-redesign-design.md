# Search Box Redesign (Design Spec)

## Problem

The direct "search by model" box on the landing page (`SearchBox` /
`SearchResultsList`, rendered inside `VehicleSelector` at the top of the
picker) has two issues:

1. **Low-contrast input.** The shared `Input` primitive (`src/components/ui/input.tsx`)
   uses `bg-transparent` with a subtle `border-input`. Against the page
   background this makes the field almost invisible (confirmed via
   screenshot — the placeholder text is the only thing legible).
2. **Too narrow.** The wrapping container is capped at `md:max-w-xs`
   (~320px), which crowds the placeholder example text
   ("Търсене по модел, напр. A6 2.0 130").
3. **Result cards under-use the data.** `SearchResultsList` renders a
   single line (`make model — type`) plus a small muted years/fuel line
   and a drive-type badge. The API (`SearchResult`, `src/lib/olyslager/types.ts:146`)
   already returns a photo and several more fields (engine code, type
   code, model code, power in HP/kW, cylinder capacity) that go unused.
4. **No visual feedback for why a result matched.** The user has to
   re-read every result to find their search term.

## Goals

- Make the search input clearly visible and a comfortable width on desktop.
- Redesign each result card: vehicle photo on the left, make+model as
  title, type as subtitle, and a labeled info grid below covering
  essentially every field `SearchResult` returns.
- Bold + primary-color highlight of the substring that matched the
  user's query, wherever that text is shown in the card.

## Non-goals

- No changes to the search API route, debounce behavior, or the
  Olyslager `search()` client call.
- No changes to the Make/Model/Type step wizard, its cards, or its own
  "search by name" filters (those are a separate, already-styled part
  of the app and out of scope here).
- No new fallback-image convention — `SearchResult.modelImageUrlMedium`
  comes directly from the Olyslager API (same source `ModelGrid` already
  trusts), so a missing photo just renders nothing, exactly like `ModelGrid`
  does today.

## Design

### 1. Input (`src/components/search/search-box.tsx`)

- Give the `Input` an explicit `className` override: `bg-card` (opaque,
  matches the card surfaces used elsewhere) instead of the inherited
  `bg-transparent`.
- Widen the wrapping container in `vehicle-selector.tsx` from
  `md:max-w-xs` to `md:max-w-md`, keeping `md:ml-auto` (right-aligned,
  unchanged layout otherwise).

### 2. Result card (`src/components/search/search-results-list.tsx`)

Each `<Card>` becomes a horizontal layout:

```
┌──────────┬──────────────────────────────────────┐
│          │  Make Model (modelCode)               │
│  photo   │  Type (typeCode)                      │
│          │  ────────────────────────────────     │
│          │  Engine code   ENGINECODE              │
│          │  Drive type    driveType                │
│          │  Year          yearStart–yearEnd        │
│          │  Power         powerHp HP / powerKw kW  │
│          │  Fuel          fuel                     │
│          │  Capacity      cilinderCapacity ccm      │
└──────────┴──────────────────────────────────────┘
```

- Photo: `result.modelImageUrlMedium`, `object-contain`, fixed box
  (e.g. `h-16 w-24`), same conditional-render-or-empty-box pattern
  `ModelGrid` already uses (no `<Image>` at all when the URL is null —
  no placeholder asset needed since this is real third-party photo data,
  not our own product catalog).
- Title line: `{make} {model}` + `{modelCode}` in parens when present
  (same pattern as `ModelGrid`'s `{model.modelName} ({model.code})`).
- Subtitle line: `{type}` + `{typeCode}` in parens when present.
- Info grid: `grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs`, one
  row per field, muted label / plain value, matching the pattern already
  established in `VehicleSidebarCard`. A row is omitted entirely when its
  underlying value is `null`.
- Card border stays neutral `border-border` (this box lives in the
  pre-results navigation area, not the results page itself, so it keeps
  the app's established gray-for-navigation / red-for-results-page
  convention — no change to that rule).
- New copy added under the existing `Search` i18n namespace (BG/EN):
  `engineCodeLabel`, `driveTypeLabel`, `yearOfProductionLabel`,
  `powerLabel`, `fuelLabel`, `capacityLabel`.

### 3. Match highlighting

- New pure function `highlightMatch(text: string, query: string): ReactNode[]`
  in `src/components/search/highlight-match.tsx`, returning an array of
  plain strings interleaved with `<span className="font-semibold text-primary">`
  elements around each case-insensitive match. Empty query or no match
  returns `[text]` unchanged.
- Applied to the title (`make`, `model`, `modelCode`) and subtitle
  (`type`, `typeCode`) lines — the fields a user is actually typing
  against (e.g. "A6 2.0 130"). Not applied to the info-grid rows (fuel,
  drive type, etc.) since those aren't what the free-text search matches
  against, and highlighting there would just be noise.
- `SearchResultsList` receives the current query string as a prop from
  `SearchBox` (it already holds `query`/`debouncedQuery` in state) so it
  can pass it down to each card.

## Testing

- Unit tests for `highlightMatch`: exact match, case-insensitive match,
  no match (returns original text), empty query, match at start/end of
  string, multiple non-overlapping occurrences.
- No new tests needed for the pure-presentational card layout changes —
  consistent with how `ModelGrid`/`VehicleSidebarCard` layout changes
  were handled in the prior redesign work.

## Files touched

- Modify: `src/components/ui/input.tsx` — no change (className override
  happens at the call site, primitive stays generic).
- Modify: `src/components/search/search-box.tsx` — `bg-card` override,
  pass `query` to results list.
- Modify: `src/components/search/search-results-list.tsx` — new card
  layout, highlight usage.
- Create: `src/components/search/highlight-match.ts` (+ `.test.ts`).
- Modify: `src/components/vehicle-selector/vehicle-selector.tsx` —
  `md:max-w-xs` → `md:max-w-md` on the `SearchBox` wrapper.
- Modify: `src/messages/en.json`, `src/messages/bg.json` — new `Search`
  namespace keys.
