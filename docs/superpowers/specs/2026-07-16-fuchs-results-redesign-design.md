# Fuchs Results Page Redesign (Eurol-inspired layout)

## Context

While investigating whether Eurol's public oil-advisor (which runs on the
same Olyslager reference data we license under the `fuchs_eu` dataset) could
be surfaced as a second product source, two blockers ruled that out:

- Eurol's WAF blocks non-browser HTTP clients *and* headless browsers (tested
  with Node `fetch` and a real headless Chromium via Playwright — both get a
  reduced, product-less HTML variant that only a genuine interactive browser
  session receives).
- Eurol's own Disclaimer page states "No part of this information may be
  reproduced, stored in a retrieval system or transmitted in any form or by
  any means without the prior written permission of Eurol BV" — an explicit
  bar on exactly what we'd need to do.

Eurol integration is paused (see conversation history; revisit only via a
formal data-sharing request to Eurol BV, not scraping).

What *did* come out of that investigation is worth keeping: Eurol's results
page (accordion per vehicle component, grouped by OEM usage indication, a
3-per-row product grid, and a vehicle-info sidebar) is a clean, generic UI
pattern — not their proprietary content — and it presents data we already
have for Fuchs more effectively than our current layout. This spec covers
restyling our existing results page (own data, own visual style) to that
structure, plus a "previous searches" quick-access list for the Make step's
sidebar, the specific piece the user liked from the Eurol screenshot.

Confirmed against live data (`/api/olyslager/recommendations/89432`, Audi A6
2.0 TFSI 162kW): our Fuchs recommendation for this vehicle already returns 7
components (Engine, two Transmission sub-parts, Transmission CVT,
Differential CVT, Hydraulic brake system, Cooling system) — the same
breadth Eurol shows for the identical vehicle. No backend or API change is
needed for this redesign; it's a presentation-layer change over data we
already fetch.

## Goals

- Replace the current `ComponentCard` (title + table) layout with collapsible
  accordion sections per component, each showing a one-line capacity summary
  in its header.
- Within each expanded section, group `productRecommendations` by `useName`
  (e.g. "Extended drain (max)" / "Normal") with one interval line per group,
  followed by a responsive 3-per-row grid of product cards (image, name,
  code).
- Move vehicle info (photo, make/model/type, year, fuel, drive type, power)
  from the current horizontal header into a sidebar alongside the accordion,
  matching the two-column layout Eurol uses.
- Add a "Previous searches" vertical list (localStorage-backed, filtered to
  the currently selected category) in the Make step's sidebar, below the
  existing name-search input, that jumps straight back to a prior result.
  The breadcrumb/search row at the top of the page is unchanged.
- Everything above styled with our own design system (existing shadcn/`ui/`
  primitives, current color/typography) — Eurol is a structural reference,
  not a visual one.

## Non-goals

- No Eurol data, no second product source. Fuchs/Olyslager remains the only
  source.
- No packaging/pack-size display (e.g. Eurol's "1L | 4L | 5L | 20L BIB...").
  Confirmed via the live API response that `salesItems` is always `[]` for
  every product in the `fuchs_eu` dataset — there's no pack-size data to
  show.
- No "More information" product link. `productUrl` is always `""` in this
  dataset too — nothing to link to yet. Revisit both of these if Fuchs ever
  populates them (see Data model change below — the fields are already
  modeled so this becomes a no-code-change follow-up).
- No changes to `/api/olyslager/*` routes or `src/lib/olyslager/client.ts`.

## Data model change

`ProductRecommendation` in `src/lib/olyslager/types.ts` is missing a field
the API already returns: `productImage: string` (confirmed present, always
`""` or `null` for this dataset today, but part of the Olyslager schema — a
future dataset or a Fuchs-side data update could start populating it with no
code change on our end beyond this type). Add it as `productImage: string |
null`. `productUrl`/`productPds`/`productMsds`/`salesItems`/`brandRanges` are
also present in the raw response but stay out of the type for now — YAGNI,
nothing in this design reads them, and they can be added the same way later
if a feature needs them.

## Product image fallback

`ProductCard` resolves its image as `product.productImage || "/products/fuchs-no-image.jpg"`.
The placeholder lives at `public/products/fuchs-no-image.jpg` (Fuchs logo,
already added). Once `productImage` is populated for a given product, that
product's real photo appears automatically — no branching logic needed
beyond the fallback expression.

## Grouping utility

New pure function, replacing the filtering approach in
`product-use-filter.ts` for the results page (that file's `extractUseNames`/
`filterComponentsByUseName` were built for a global "Use" filter dropdown,
which this redesign removes in favor of always showing every group, matching
Eurol's presentation and the user's stated preference):

```ts
// src/components/results/group-products-by-use.ts
export interface ProductUseGroup {
  useName: string;
  useAppOrder: number;
  intervals: ProductInterval[]; // taken from the group's first product
  products: ProductRecommendation[];
}

export function groupProductsByUse(
  products: ProductRecommendation[],
): ProductUseGroup[]
```

Confirmed against live data: every product within a given `useName` group for
a component shares identical `intervals` (checked Engine's "Extended drain
(max)" and "Normal" groups across all their products) — so showing one
interval line per group, taken from the first product, is correct, not a
lossy simplification. Grouping preserves the incoming order (products already
arrive sorted by `productAppOrder` from `sortRecommendation` in
`client.ts`), and groups are ordered by `useAppOrder` ascending.

## Component architecture

- **`VehicleSidebarCard`** (rename/repurpose of `VehicleHeaderCard`, moved
  into a sidebar column): same fields as today (photo, make/model/type,
  year, fuel, drive type, power) — no data changes, just layout (vertical
  card instead of horizontal header) to sit beside the accordion instead of
  above it.
- **`ComponentAccordion`** (replaces `ComponentCard`): one accordion item per
  `RecommendationComponent`, built on a new `src/components/ui/accordion.tsx`
  (add via `npx shadcn add accordion` — this project's `components.json` is
  already configured for the `base-nova` style on `@base-ui/react`, matching
  every other primitive in `ui/`). Trigger shows `componentName` +
  `componentCode` badge (unchanged from today) plus a new one-line capacity
  summary — each capacity rendered as `item value unit (condition)` and
  joined with `" | "`, mirroring Eurol's single-line format — replacing the
  current body-rendered `CapacitiesList`. `CapacitiesList` is
  removed — its dl-based rendering has no remaining caller once this summary
  line replaces it. A component with zero `productRecommendations` and zero
  `capacities` keeps today's `hasContent` behavior from `ComponentCard`: the
  accordion item still renders (so the component name/code isn't silently
  dropped from the list) but its body shows the existing `noComponents`
  message instead of a capacity summary/product grid. The separate
  top-level case in `ResultsPanel` — the entire recommendation has zero
  components — is unchanged, same message, same place.
- **`ProductUseSection`** (new): renders one `ProductUseGroup` — the
  `useName` label, its interval line, and a `ProductGrid`.
- **`ProductGrid`** (replaces `ProductRecommendationTable`): CSS grid,
  `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, one `ProductCard` per product,
  wrapping to as many rows as needed (we show every recommended product, not
  just a top-3 — unlike Eurol's curated "Our advice/2nd/3rd option", our own
  data has no such ranking beyond `productAppOrder`, and hiding our own
  product recommendations isn't something the user asked for).
- **`ProductCard`** (new): image (fallback above), `productName`,
  `productCode` badge. No packaging list, no "more information" button (see
  Non-goals).
- **`ResultsPanel`** (changed): two-column layout — `ComponentAccordion` list
  in the main column, `VehicleSidebarCard` in a sidebar — replacing today's
  `FilterableStepLayout` use (that wrapper stays unchanged and keeps serving
  `make-grid`/`model-grid`/`type-table`, which are unrelated to this
  redesign). The global use-`<select>` filter and its state are removed
  along with `product-use-filter.ts`.

## "Previous searches"

A small localStorage-backed list of recently viewed results, rendered as a
**vertical list** (not pills/chips) inside the Make step's existing filter
sidebar, directly below the "Search by name" input — the placement and
style the user asked for from the make-grid screenshot. It appears **only
on the Make step** (right after a category is chosen), not on
Model/Type/Results — a narrower scope than earlier drafts of this section.

Confirmed the cleanest navigation mechanism: `deriveStep` already treats
`hasType` alone as sufficient to jump straight to the results step
regardless of make/model state (`if (hasType) return "results"`) — this is
the exact mechanism `SearchBox`'s `selectSearchResult` already uses (sets
`category/make/model` to `null`, sets `typeId` + `typeLabel` directly,
pushes the URL). Clicking a previous-search row reuses this same path — no
new step-resolution logic needed.

- **`src/lib/recent-searches.ts`** — plain localStorage helpers, client-only:
  `getRecentSearches()`, `addRecentSearch(entry)` (dedups by `typeId`,
  unshifts, caps at, say, 20 entries — higher than a pill-bar would want,
  since entries are now filtered per category rather than all shown at
  once), under key `apl-oil-chooser:recent-searches`. Entry shape: `{
  typeId, categoryId, categoryName, makeName, modelName, typeName,
  yearStart, yearEnd }` — `categoryId` is the addition that makes
  per-category filtering possible; the rest is enough to render a label
  without needing the full `Recommendation` again.
- **`src/hooks/use-recent-searches.ts`** — thin hook wrapping the above:
  starts with an empty array (SSR-safe — no `window` access during server
  render), populates from localStorage in a mount effect, exposes `add()`.
- **`RecentSearchesList`** (new,
  `src/components/vehicle-selector/recent-searches-list.tsx`): given
  `entries` + `onSelect`, renders a simple vertical list (each row e.g.
  "`{makeName} · {modelName} · {typeName}`"), or `null` when there are no
  entries for the current category — no empty-state placeholder needed, it
  just doesn't take up sidebar space until there's relevant history.
- **Category filtering**: `MakeGrid` already receives `categoryId` as a
  prop. It filters the full list from `useRecentSearches()` down to
  `entries.filter(e => e.categoryId === categoryId)` before handing it to
  `RecentSearchesList` — no separate filter control needed, this is what
  "filtered by category" means here. Switching category (re-mounting
  `MakeGrid` with a new `categoryId`) naturally shows that category's own
  history.
- **Placement**: `MakeGrid` appends `RecentSearchesList` below its existing
  name-search `<Input>`, inside the same `filters` node it already passes to
  `FilterableStepLayout` — `filters={<>{nameSearchInput}<RecentSearchesList
  .../></>}`. `ModelGrid`, `TypeTable`, `ResultsPanel`, and
  `FilterableStepLayout` itself are untouched by this feature.
- **`VehicleSelector`** (changed): owns the `useRecentSearches()` hook call
  and passes `{ entries, onSelect: jumpToType }` down to `MakeGrid` as one
  new prop. Extends the existing `onLoaded={(rec) =>
  setTypeLabel(rec.typeName)}` callback passed to `ResultsPanel` to also
  call `add({ typeId, categoryId: rec.categoryId, categoryName:
  rec.categoryName, ... })` — so a search is recorded once its result
  actually loads, regardless of which step the user started from (drill-down
  or the top search box). Clicking a row calls the same four
  `setCategory(null) / setMake(null) / setModel(null) /
  setTypeId(entry.typeId) / setTypeLabel(entry.typeName)` +
  `pushSelection({ categoryId: null, makeId: null, modelId: null, typeId:
  entry.typeId })` sequence `selectSearchResult` already performs — pulled
  into a small shared local function (`jumpToType(typeId, typeLabel)`) that
  both `selectSearchResult` and the new row click call, instead of
  duplicating the five-line sequence twice.
- The top breadcrumb/search row (`BreadcrumbChip`s + `SearchBox`) is
  **unchanged** — this feature lives entirely in the Make step's sidebar,
  not up there.

## i18n

New keys under `Results` (both `bg.json`/`en.json`): `previousSearchesLabel`.
Removed (no longer referenced anywhere after this change):
`useFilterLabel`. `recommendedProducts`, `capacities`, `changeInterval`,
`productColumn`, `codeColumn`, `useColumn`, `noComponents`,
`dataLanguageNote` all stay — `noComponents` and `dataLanguageNote` are
still used as-is; the table-column keys (`productColumn` etc.) become
unused once `ProductRecommendationTable` is removed and should be deleted
in the same change.

## Files touched

- New: `src/components/ui/accordion.tsx` (via shadcn CLI)
- New: `src/components/results/group-products-by-use.ts` (+ unit test,
  matching the existing `product-use-filter.test.ts` pattern)
- New: `src/components/results/product-use-section.tsx`
- New: `src/components/results/product-grid.tsx`
- New: `src/components/results/product-card.tsx`
- New: `src/lib/recent-searches.ts` (+ unit test)
- New: `src/hooks/use-recent-searches.ts`
- New: `src/components/vehicle-selector/recent-searches-list.tsx`
- Changed → rename: `vehicle-header-card.tsx` → `vehicle-sidebar-card.tsx`
- Changed → rename: `component-card.tsx` → `component-accordion.tsx`
- Changed: `results-panel.tsx` (two-column layout, drop use-filter state)
- Changed: `make-grid.tsx` (append `RecentSearchesList` below its
  name-search input, receives `recentSearches`/`onSelectRecentSearch` props)
- Changed: `vehicle-selector.tsx` (`useRecentSearches()` hook, `jumpToType`
  helper shared with `selectSearchResult`, records a search once
  `ResultsPanel.onLoaded` fires)
- Changed: `src/lib/olyslager/types.ts` (`productImage` field)
- Changed: `src/messages/bg.json`, `src/messages/en.json` (i18n keys above)
- Removed: `src/components/results/product-recommendation-table.tsx`
- Removed: `src/components/results/capacities-list.tsx`
- Removed: `src/components/vehicle-selector/product-use-filter.ts` (+ its
  test)
- Unchanged: all `/api/olyslager/*` routes, `client.ts`,
  `filterable-step-layout.tsx` itself (only Make's `filters` content passed
  into it changes; Model/Type keep using it exactly as today; Results stops
  using it entirely in favor of its own two-column layout — see Component
  architecture above), `category-grid.tsx`, `model-grid.tsx`,
  `type-table.tsx`

## Testing

- `group-products-by-use.ts`: pure function, unit-testable the same way as
  `sort-by-app-order.test.ts` / `type-filters.test.ts` — cover grouping by
  `useName`, `useAppOrder` ordering, and the single-interval-per-group
  assumption (including the defensive fallback if a future dataset ever
  violates it: use the first product's intervals rather than throwing).
- `recent-searches.ts`: unit-testable with a `localStorage` stub (dedup by
  `typeId`, cap at the entry limit, most-recent-first ordering); the
  category-scoped filtering itself is a plain `Array.filter` at the
  `MakeGrid` call site, not part of this module, so no separate test needed
  beyond `MakeGrid`'s own coverage.
- Manual verification in-browser: confirm accordion expand/collapse, product
  grid wraps correctly at 1/2/3 columns per breakpoint, placeholder image
  shows for every current product (since `productImage` is always empty
  today), the Make step's sidebar list only shows entries matching the
  currently selected category, and clicking a row lands on the same results
  page as a fresh drill-down for that vehicle.
