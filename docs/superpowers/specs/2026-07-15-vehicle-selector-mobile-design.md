# Vehicle Selector Mobile Responsive Support — Design

## Context

APL-OIL-CHOOSER's vehicle selector (`src/components/vehicle-selector/`) was built desktop-only, targeting a wide iframe embed on the Auto Plus Bulgaria host site. It's now getting mobile/responsive support. The selector is a single persistent-category-grid + breadcrumb-chip + step-content flow: `CategoryGrid` always visible at top, a breadcrumb chip row with a search box, then one of `MakeGrid` / `ModelGrid` / `TypeTable` / `ResultsPanel` below depending on drill-down progress. Each of those four step components renders through `FilterableStepLayout`, a two-column wrapper (`min-w-0 flex-1` content + `w-64 shrink-0` filters aside) that is not responsive today.

## Breakpoint

A single breakpoint marks the transition: Tailwind's `md` (768px).

- `≥ 768px`: current desktop layout, unchanged.
- `< 768px`: mobile treatment described below.

Implementation is pure CSS via Tailwind responsive utility classes (`md:hidden`, `hidden md:flex`, etc.) — no JS-based viewport-detection hook (`window.matchMedia`/`useMediaQuery`). This avoids SSR/hydration mismatches and matches the existing codebase idiom (`CategoryGrid`, `MakeGrid`, `ModelGrid` already use responsive Tailwind classes for column counts).

## FilterableStepLayout: hamburger + drawer

`FilterableStepLayout` (`src/components/vehicle-selector/filterable-step-layout.tsx`) is the only component that changes behavior structurally.

- **Desktop (`≥ md`)**: unchanged — when `filters` is provided, renders the existing two-column `flex` layout (content + `w-64 shrink-0` aside). When `filters` is absent, renders `content` alone, as today.
- **Mobile (`< md`)**: when `filters` is provided, content renders full width. Above it, a right-aligned button (lucide-react `SlidersHorizontal` icon + a `filtersButtonLabel` i18n string, e.g. "Filters"/"Филтри") is rendered, visible only below `md` via `md:hidden`. Clicking it opens a slide-over `Sheet` from the right containing the same `filters` node. The sheet closes via a backdrop click or a close (X) button. When `filters` is absent, mobile behaves exactly like desktop (content alone, no button).
- The hamburger button and sheet are new elements owned entirely by `FilterableStepLayout`; `MakeGrid`, `ModelGrid`, `TypeTable`, and `ResultsPanel` are unchanged — they keep passing `content`/`filters` exactly as they do today.
- `FilterableStepLayout` gains one new piece of local state: `isDrawerOpen: boolean`, toggled by the hamburger button and by the sheet's own close affordances.

### New `Sheet` primitive

A new `src/components/ui/sheet.tsx` is added, following this project's existing Base UI (not Radix) shadcn-primitive convention (matching `select.tsx`, etc.), built on Base UI's Dialog. It renders a backdrop plus a panel sliding in from the right, sized to a comfortable reading width on mobile (e.g. ~85–90% of viewport width, capped), with a close button. It is a generic primitive (title/children/open/onOpenChange), not filter-specific, so it could be reused elsewhere later — but this plan only wires it into `FilterableStepLayout`.

## TypeTable: horizontal scroll

Below `md`, the `<Table>` in `type-table.tsx` is wrapped in a horizontally scrollable container (`overflow-x-auto`). No column restructuring, no card-based mobile-only render path — all 6 columns (type name, fuel, years, power, capacity, cylinders) plus the action button stay exactly as they are today; the user scrolls/swipes horizontally to see columns that don't fit.

## Breadcrumb + search row

Today, `vehicle-selector.tsx` renders breadcrumb chips and the search box in one `flex flex-wrap items-center gap-2` row, with the search box pinned right via `ml-auto w-full max-w-xs`.

Below `md`: the row becomes a column (`flex-col md:flex-row`), so breadcrumb chips keep their own wrapping line, and the search box renders as a full-width block on its own row underneath — no more squeezing both into one narrow row.

## Grid column tuning

- `CategoryGrid` (`grid-cols-3 md:grid-cols-6`): no change — already switches exactly at the chosen breakpoint.
- `ModelGrid` (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`): no change — base 2-column already comfortable for model cards (120×60 image + name + years).
- `MakeGrid` (`grid-cols-4 sm:grid-cols-6 lg:grid-cols-8`): base changes to `grid-cols-3` (from 4), keeping `sm:grid-cols-6 lg:grid-cols-8` unchanged — gives make icon+label tiles more breathing room below `sm` (640px).

## Testing

This work is markup/CSS/interaction-state — no new pure, independently-testable logic is introduced (matching the precedent set by `FilterableStepLayout` itself in the original filters feature, which has no test file for the same reason — confirmed in that feature's plan that `node --test` cannot execute `.tsx` files at all).

Verification is manual via the `webapp-testing` Playwright workflow:

- At a mobile viewport (375×812): for each of make/model/type/results steps that has filters, confirm the hamburger button appears, opens the sheet, filters inside it work identically to desktop (same pure filter functions, only the container changed), and the sheet closes via backdrop and via the close button.
- At a mobile viewport: confirm TypeTable scrolls horizontally without column wrapping, and the breadcrumb+search row stacks as described.
- At a desktop viewport (e.g. 1440×900): confirm zero regression — two-column filter layout, single-row breadcrumb+search, no hamburger button rendered, `MakeGrid` still at `sm:grid-cols-6 lg:grid-cols-8` above 640px.

## Out of scope

- Redesigning `TypeTable` into cards on mobile.
- Any JS-based viewport detection or matchMedia hook.
- Changes to `CategoryGrid`/`ModelGrid` column counts.
- Changes to `ResultsPanel`'s or any grid's underlying data/filter logic — only the containing layout changes.
