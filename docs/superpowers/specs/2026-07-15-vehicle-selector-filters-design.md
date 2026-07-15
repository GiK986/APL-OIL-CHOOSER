# Vehicle Selector — Client-Side Filters Design

## Context

The picker (category → make → model → type → results, see
[2026-07-15-vehicle-selector-redesign-design.md](2026-07-15-vehicle-selector-redesign-design.md))
works well but has no way to narrow long lists: the Make grid can show up to
158 items, Model grids can run into the dozens, the Type table can have many
engine variants per model, and the results page can list many recommended
products across several components. This adds client-side filters — no new
API surface, no new fetches — that operate on data already loaded for the
current step.

Scope: filters for make/model name search, type-table facets (fuel, drive
type, power range), and a results-page product-use filter, all shown in a
panel on the right side of the layout.

## Layout

The page container widens from `max-w-5xl` to a fixed wider max-width (e.g.
`max-w-6xl`) applied unconditionally, on every step — this avoids the page
reflowing/jumping width as the user moves between steps. Within that fixed
container, each step independently decides whether to split into
content + filter panel or use the full width:

- **Category step**: no filter panel (6 fixed cards, nothing to narrow).
  Full width, unchanged from today.
- **Make / Model / Type / Results steps**: content area + a `~256px` (`w-64`)
  filter panel on the right, only rendered when that step has at least one
  filter control to show (all four currently do).

## Component architecture

A single small presentational wrapper avoids duplicating the two-column
shell in four places:

```tsx
// src/components/vehicle-selector/filterable-step-layout.tsx
export function FilterableStepLayout({
  content,
  filters,
}: {
  content: ReactNode;
  filters?: ReactNode;
}) {
  if (!filters) return <>{content}</>;
  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1">{content}</div>
      <aside className="w-64 shrink-0">{filters}</aside>
    </div>
  );
}
```

Each step component keeps owning its own data fetch (unchanged) and now also
owns its own filter `useState` + filtering logic, computing a filtered list
before rendering and returning:

```tsx
return <FilterableStepLayout content={<gridJsx/>} filters={<filterControlsJsx/>} />;
```

No portals, no context, no lifting filter state into `VehicleSelector` — each
component stays independently understandable (fetch → filter → render), and
`VehicleSelector` doesn't need to know filters exist at all.

Filter state is **local component state only** — not persisted to the URL
(the vehicle-selection ids already are; filters are considered transient
view state, not part of the shareable "which vehicle" link). Filter state
naturally resets when a step component unmounts (e.g. picking a make
unmounts `MakeGrid`, remounting a fresh `ModelGrid` with its own fresh
filter state) — no explicit reset code needed.

## Filters per step

### Make grid / Model grid — name search

- One `<Input>` in the panel: "Търсене по име" / "Search by name".
- Instant client-side substring filter (case-insensitive) over the already-
  fetched list — no debounce (no network call involved).
- Empty-state when the filter matches nothing: the new `noMatches` message
  (distinct from the existing `emptyMakes`/`emptyModels` "API returned zero
  items" messages — these are two different situations and must say
  different things) + a "Изчисти филтър" / "Clear filter" button that resets
  the input.

### Type table — fuel / drive type / power range

Three controls in the panel, combined with AND:

- **Гориво / Fuel** — `<Select>`, options built dynamically from the
  distinct `fuel` values present in the currently loaded types list (plus an
  "Всички" / "All" default), not a hardcoded list — different models can
  have different fuel types.
- **Задвижване / Drive type** — same pattern over `driveType`.
- **Мощност (HP) / Power (HP)** — two `<Input type="number">` ("От"/"До" —
  "From"/"To"), filters rows whose `powerHP` falls in the given range. Either
  bound alone is valid (open-ended range).
- "Изчисти филтри" / "Clear filters" button, shown only when at least one
  filter is active.
- Empty-state when filters match zero rows: same new `noMatches` message as
  above (distinct from the existing `emptyTypes` "API returned zero items"
  message).
- Existing sortable-column behavior (Task from the redesign) is unaffected —
  filtering happens before sorting.

### Results page — product use

- One `<Select>` "Приложение" / "Use", options built dynamically from the
  distinct `useName` values found across all `productRecommendations` in the
  currently loaded recommendation (plus "Всички" / "All").
- Filters which product rows show inside each `ComponentCard`; **capacities
  are always shown** regardless of this filter (they aren't tied to a
  `useName`).
- If filtering leaves a component with zero matching products and it also
  has no capacities, that component shows the existing
  `Results.noComponents` empty message instead of an empty product table
  (reuses `ComponentCard`'s current `hasContent` check — no new i18n string).

## Data flow / error handling

No changes to fetching, caching, loading, or error states — filters operate
purely on data that has already successfully loaded. If a grid/table is in
its loading or error state, the filter panel does not render (nothing to
filter yet); it appears once data arrives, matching the "only when there are
real filters for the current step" rule from the layout section.

## i18n

New keys needed (both `bg.json` and `en.json`), under existing namespaces:

- `VehiclePicker`: `filterByName` (placeholder text), `clearFilter`,
  `clearFilters`, `fuelFilterLabel`, `driveTypeFilterLabel`,
  `powerFromLabel`, `powerToLabel`, `allOption` (for "Всички"/"All" selects),
  `noMatches` (empty-state message when a filter yields zero rows).
- `Results`: `useFilterLabel`.

## Files touched

- New: `src/components/vehicle-selector/filterable-step-layout.tsx`
- Changed: `src/components/vehicle-selector/make-grid.tsx`,
  `model-grid.tsx`, `type-table.tsx`, `results-panel.tsx` (add local filter
  state + filter controls JSX, wrap return in `FilterableStepLayout`)
- `results-panel.tsx` filters entirely on its own side: it maps
  `data.components` to copies with a filtered `productRecommendations` array
  (`{...component, productRecommendations: component.productRecommendations.filter(...)}`)
  before rendering `ComponentCard` — `component-card.tsx` itself is
  **unchanged**, it already renders whatever `productRecommendations` it's
  given.
- Changed: `src/app/[locale]/page.tsx` (container max-width)
- Changed: `src/messages/bg.json`, `src/messages/en.json` (new keys above)
- Unchanged: all `/api/olyslager/*` routes, `src/lib/olyslager/*`, URL
  query-param state in `vehicle-selector.tsx` (filters are not part of it)

## Testing

- `filterable-step-layout.tsx` is trivial presentational logic (renders
  full-width vs split based on whether `filters` is provided) — a
  `node --test` unit test covering both branches is enough, matching the
  existing `derive-step.test.ts` pattern in this codebase.
- Each filter's matching logic (name substring, fuel/driveType equality,
  power range, useName equality) is a pure function extractable and
  unit-testable the same way, rather than inlined `.filter()` callbacks —
  keeps the per-component diff small and the matching logic independently
  verifiable.
