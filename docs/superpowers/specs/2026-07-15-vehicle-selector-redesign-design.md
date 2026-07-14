# Vehicle Selector Redesign — Design

## Context

The current picker (four stacked `<Select>` dropdowns for category/make/model/type)
works but looks generic and "too simple" per user feedback. The app will be
embedded as an iframe inside an existing B2B automotive parts catalogue site
("Auto Plus Bulgaria", built on a TecDoc-style vehicle-selection engine at
`tm1.carparts-cat.com`), so the UI needs to visually match that host site as
closely as possible rather than look like a bolted-on widget.

We inspected the host site live (Chrome browser automation) and captured its
actual vehicle-selection flow: Manufacturer (logo grid) → Model Group (text
pills) → Model (image grid) → Type (sortable data table). This is richer than
our current four-dropdown picker and maps almost 1:1 onto fields Olyslager
already returns (`imageUrlMedium` for makes/models, `powerHP`/`cylinderCC`/
`fuel`/etc. for types) — no new data is needed, only new presentation.

Scope: full visual identity (colors, radius, typography, density) plus a
restructured vehicle-selection interaction (breadcrumb chips + grids/table
replacing four dropdowns), applied consistently across the picker and the
existing results page.

## Design tokens

Extracted from the host site via computed-style inspection (not guessed):

| Token | Value | Source |
|---|---|---|
| `accent` | `#BE0F0C` | cart badge background |
| `accent-foreground` | `#FFFFFF` | — |
| `page-bg` | `#EAE9E9` | `document.body` background |
| `surface` | `#FFFFFF` | cards |
| `neutral` | `#E0E0E0` | "Details" button background |
| `neutral-foreground` | `#212121` | "Details" button text |
| `pill-active` | `#646567` | active breadcrumb sub-tab background |
| `radius` | `3px` | consistent across every button/card/chip on the host site |
| `font` | `"Open Sans", Arial, Helvetica, sans-serif` | `document.body` computed font-family |

These replace the current shadcn defaults (`rounded-lg` ~8px, Geist font,
default zinc/blue palette). Applied via Tailwind theme + CSS variables in
`globals.css`, so all existing shadcn primitives (Button, Card, Badge, Table)
pick them up without per-component overrides.

## Component architecture

Single container owns a step state machine; each step renders one grid/table
and collapses into a removable breadcrumb chip once a selection is made.

```
┌─────────────────────────────────────────────────────────┐
│ [🚗 Cars ×] [Audi ×] [A6, S6, RS6 ×]      SEARCH: [____] │
├─────────────────────────────────────────────────────────┤
│  Active step's grid/table (only one visible at a time):  │
│  category → make → model → type                          │
└─────────────────────────────────────────────────────────┘
```

- **`vehicle-selector.tsx`** (replaces `vehicle-picker.tsx`) — owns
  `{categoryId, makeId, modelId, typeId}` and a derived `step`
  (`'category' | 'make' | 'model' | 'type'`, computed from which ids are set,
  not stored separately). Renders the breadcrumb row + the active step's grid.
  Category defaults to `Cars` (id 1) on mount so the picker opens directly on
  the Make grid, matching the original "car selected by default" request.
- **`breadcrumb-chip.tsx`** — icon/logo + label + `×`; clicking `×` clears
  that id and every id after it (cascading reset, same logic already in the
  old picker's `onXChange` handlers).
- **`category-grid.tsx`** — 6 cards, one lucide icon per Olyslager category
  (`car-front`, `van`, `motorbike`, `truck`, `tractor`, `construction`),
  selected state uses `accent` border/background.
- **`make-grid.tsx`** — dense grid, `imageUrlMedium` + `makeName` per card
  (data already returned by `/api/olyslager/makes`, no new fetch shape).
- **`model-grid.tsx`** — grid, `imageUrlMedium` + `modelName` +
  `yearStart–yearEnd`, same layout family as make-grid (shared card styling,
  not a shared component, since the two show clearly different content
  besides positioning).
- **`type-table.tsx`** — sortable table (Type / Fuel / Years / Power /
  Capacity / Cylinders columns, sourced from the existing `VehicleType`
  fields), one "Преглед"/"View" button per row navigating straight to
  `/results/{typeId}` (replaces the host site's separate Details/Apply pair
  — we only need one action).
- **`search-box.tsx`** — moves inline next to the breadcrumb row (top-right),
  same debounce/fetch logic as today, still an independent shortcut that
  navigates straight to `/results/{typeId}`.

`use-olyslager-list.ts` is reused unchanged for make/model/type fetching.

## Interaction / data flow

1. Mount → category defaults to Cars → make grid loads immediately.
2. Selecting a card in any grid sets that id, which both (a) collapses the
   current grid into a chip and (b) triggers the next grid's fetch (existing
   cascading-reset behavior from `vehicle-picker.tsx` carries over unchanged).
3. Clicking a chip's `×` clears that id and all downstream ids, re-expanding
   that step's grid.
4. Selecting a row in the type table navigates to `/results/{typeId}` — no
   separate "view recommendations" button needed since the table row action
   *is* the final step.
5. Search box results also navigate straight to `/results/{typeId}`,
   bypassing the breadcrumb entirely (unchanged from current behavior).

## Results page

No structural change — header card, component cards, product table,
capacities stay as-is. Only the shared design tokens change (radius, border
color/weight, font, accent color for badges), inherited automatically via
the shadcn primitives once the theme tokens are updated.

## Files touched

- New: `src/components/vehicle-selector/{vehicle-selector,breadcrumb-chip,category-grid,make-grid,model-grid,type-table}.tsx`
- Removed: `src/components/vehicle-picker/` (entire directory, superseded)
- Changed: `src/app/globals.css` (theme tokens), `src/app/[locale]/layout.tsx`
  (font import: Open Sans instead of Geist), `src/app/[locale]/page.tsx`
  (mount `VehicleSelector` instead of `VehiclePicker` + `SearchBox`
  separately — search moves inside the selector's breadcrumb row)
- Changed: `src/messages/bg.json`, `src/messages/en.json` — new keys for
  breadcrumb chip labels, table column headers, per-row action label
- Unchanged: `src/lib/olyslager/*`, all six `/api/olyslager/*` route
  handlers, `src/hooks/use-olyslager-list.ts`, results page and its
  components (only inherit new tokens, no code changes)

## Verification

- Manual browser walkthrough (Playwright, as used for the original picker):
  full flow Cars → make → model → type-table row click → results, confirming
  each chip appears/collapses correctly and `×` resets downstream steps.
- Visual comparison against the captured Auto Plus screenshots for card
  density, chip styling, and table column layout.
- Both `/bg` and `/en` locales checked for the new breadcrumb/table copy.
