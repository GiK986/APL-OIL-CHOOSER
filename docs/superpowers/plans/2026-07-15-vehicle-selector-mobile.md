# Vehicle Selector Mobile Responsive Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the vehicle selector usable on mobile viewports (<768px) without changing anything at desktop widths (≥768px).

**Architecture:** A single Tailwind breakpoint (`md`, 768px) drives every change, implemented purely with responsive CSS utility classes — no JS viewport-detection hook. `FilterableStepLayout` gains a hamburger button (mobile-only) that opens a new `Sheet` slide-over primitive containing the filters; `TypeTable` gets a horizontal-scroll wrapper; the breadcrumb+search row restructures to stack on mobile; `MakeGrid`'s base column count drops by one for more breathing room on narrow phones.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, `@base-ui/react` (Dialog primitive for the new Sheet), `lucide-react` icons, `tw-animate-css` (already relied on by `select.tsx` for `data-open`/`data-closed` animation utility classes), `next-intl` for the two new UI strings.

## Global Constraints

- Single breakpoint: Tailwind `md` (768px). `< md` = mobile treatment; `≥ md` = today's desktop layout, must render pixel-identical to before this plan.
- CSS-only responsive behavior — never introduce `window.matchMedia`/`useMediaQuery`/any JS viewport-detection hook.
- `MakeGrid`, `ModelGrid`, `TypeTable`, `ResultsPanel` are NOT modified except the one specific class-string change called out for `MakeGrid` in Task 5, and the wrapping `<div>` around `TypeTable`'s `<Table>` in Task 3 — all mobile drawer/hamburger behavior lives entirely inside `FilterableStepLayout`.
- `CategoryGrid` and `ModelGrid` need no changes anywhere in this plan — their existing responsive classes (`grid-cols-3 md:grid-cols-6` and `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) already fit the chosen breakpoint / are already comfortable on mobile.
- `TypeTable` gets horizontal scroll only — no card-based mobile-only render path, no column restructuring.
- New UI primitives (`Sheet`) follow this project's existing Base UI (not Radix) shadcn-primitive convention: import from `@base-ui/react/<part>`, alias `as <Part>Primitive`, `data-slot` attributes, `cn()` for class merging — mirror `src/components/ui/select.tsx`.
- New i18n strings go in both `src/messages/en.json` and `src/messages/bg.json`: `VehiclePicker.filtersButtonLabel` and `Common.closeLabel`.
- No new `node --test` files — this plan is markup/CSS/interaction-state work with no new pure, independently-testable logic (same reasoning already documented for `FilterableStepLayout` having no test file: `node --test` cannot execute `.tsx` files at all).
- Verification throughout is manual via the `webapp-testing` skill's Playwright workflow (`scripts/with_server.py`), at a mobile viewport (375×812) and a desktop viewport (1440×900).

---

### Task 1: Add the `Sheet` UI primitive

**Files:**
- Create: `src/components/ui/sheet.tsx`

**Interfaces:**
- Consumes: `@base-ui/react/dialog` (`Dialog.Root`, `Dialog.Portal`, `Dialog.Backdrop`, `Dialog.Popup`, `Dialog.Title`, `Dialog.Close`), `cn` from `@/lib/utils`, `XIcon` from `lucide-react`.
- Produces: `Sheet` (= `Dialog.Root`, props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `children`) and `SheetContent` (props: `title: string`, `closeLabel: string`, `className?: string`, `children: ReactNode`) — both exported from `src/components/ui/sheet.tsx`. Task 2 imports both by name.

- [ ] **Step 1: Write the component**

Create `src/components/ui/sheet.tsx`:

```tsx
"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = DialogPrimitive.Root

interface SheetContentProps extends Omit<DialogPrimitive.Popup.Props, "title"> {
  title: string
  closeLabel: string
}

function SheetContent({
  className,
  children,
  title,
  closeLabel,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="sheet-backdrop"
        className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-sm flex-col gap-4 border-l border-border bg-background p-4 shadow-lg outline-none data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <DialogPrimitive.Title className="text-sm font-medium">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="rounded-[3px] p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

export { Sheet, SheetContent }
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/ui/sheet.tsx`
Expected: both commands exit with no errors and no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sheet.tsx
git commit -m "feat: add Sheet UI primitive for mobile filter drawer"
```

---

### Task 2: FilterableStepLayout mobile hamburger + drawer

**Files:**
- Modify: `src/components/vehicle-selector/filterable-step-layout.tsx` (full rewrite, currently 19 lines)
- Modify: `src/messages/en.json` (add one key to `VehiclePicker`, one to `Common`)
- Modify: `src/messages/bg.json` (same two keys, Bulgarian copy)

**Interfaces:**
- Consumes: `Sheet`, `SheetContent` from `@/components/ui/sheet` (Task 1). `Button` from `@/components/ui/button` (existing). `useTranslations` from `next-intl` (existing pattern, e.g. `src/components/vehicle-selector/type-table.tsx`).
- Produces: `FilterableStepLayout` keeps its existing public signature — `{ content: ReactNode; filters?: ReactNode }` — unchanged. `MakeGrid`/`ModelGrid`/`TypeTable`/`ResultsPanel` require zero changes.

Current file (`src/components/vehicle-selector/filterable-step-layout.tsx`), for reference:

```tsx
import type { ReactNode } from "react";

interface FilterableStepLayoutProps {
  content: ReactNode;
  filters?: ReactNode;
}

export function FilterableStepLayout({ content, filters }: FilterableStepLayoutProps) {
  if (!filters) {
    return <>{content}</>;
  }
  return (
    <div className="flex items-start gap-6">
      <div className="min-w-0 flex-1">{content}</div>
      <aside className="w-64 shrink-0">{filters}</aside>
    </div>
  );
}
```

- [ ] **Step 1: Add the two i18n keys**

In `src/messages/en.json`, inside the `VehiclePicker` object, add after `"noMatches": "No matches for the current filter"`:

```json
    "noMatches": "No matches for the current filter",
    "filtersButtonLabel": "Filters"
```

In the same file, inside the `Common` object, add after `"allOption": "All"`:

```json
    "allOption": "All",
    "closeLabel": "Close"
```

In `src/messages/bg.json`, inside the `VehiclePicker` object, add after `"noMatches": "Няма съвпадения с текущия филтър"`:

```json
    "noMatches": "Няма съвпадения с текущия филтър",
    "filtersButtonLabel": "Филтри"
```

In the same file, inside the `Common` object, add after `"allOption": "Всички"`:

```json
    "allOption": "Всички",
    "closeLabel": "Затвори"
```

(Remember trailing commas: each of these is inserted before the following existing key, so add a comma after the newly inserted line only if another key follows it — match whatever the surrounding JSON already does.)

- [ ] **Step 2: Rewrite the component**

Replace the full contents of `src/components/vehicle-selector/filterable-step-layout.tsx` with:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface FilterableStepLayoutProps {
  content: ReactNode;
  filters?: ReactNode;
}

export function FilterableStepLayout({ content, filters }: FilterableStepLayoutProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (!filters) {
    return <>{content}</>;
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
      <div className="flex justify-end md:hidden">
        <Button variant="outline" size="sm" onClick={() => setIsDrawerOpen(true)}>
          <SlidersHorizontal className="size-3.5" />
          {t("filtersButtonLabel")}
        </Button>
      </div>
      <div className="min-w-0 flex-1">{content}</div>
      <aside className="hidden md:block md:w-64 md:shrink-0">{filters}</aside>
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent title={t("filtersButtonLabel")} closeLabel={tc("closeLabel")}>
          {filters}
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint .`
Expected: both commands exit with no errors and no output.

- [ ] **Step 4: Manual verification**

Use the `webapp-testing` skill. Start the dev server (`scripts/with_server.py --server "npm run dev" --port 3000 -- python <your_script>.py`) and drive a Playwright script that:

1. Navigates to `http://localhost:3000/bg?categoryId=1&makeId=910052` (Audi, has a populated `ModelGrid` with a name filter).
2. Sets viewport to 375×812. Confirms a button showing the "Филтри" label is visible above the model grid, and that the `w-64` aside is not visible (its bounding box has zero width/height, or `display: none` via computed style).
3. Clicks that button. Confirms a panel slides in from the right containing the same "Търсене по име" filter input, and a backdrop is present.
4. Types into the filter input inside the open sheet; confirms the underlying model grid filters exactly as it does on desktop (same pure `matchesNameFilter` logic, only the container changed).
5. Clicks the backdrop (a point far from the panel, e.g. `(10, 10)`). Confirms the panel closes.
6. Reopens the panel, clicks the close (X) button this time. Confirms it also closes.
7. Sets viewport to 1440×900. Confirms the button from step 2 is no longer visible, and the `w-64` filters aside is visible side-by-side with the model grid, exactly as before this task (no regression).

- [ ] **Step 5: Commit**

```bash
git add src/components/vehicle-selector/filterable-step-layout.tsx src/messages/en.json src/messages/bg.json
git commit -m "feat: add mobile hamburger + drawer to FilterableStepLayout"
```

---

### Task 3: TypeTable horizontal scroll on mobile

**Files:**
- Modify: `src/components/vehicle-selector/type-table.tsx:136` and `:242` (the `<Table>...</Table>` block inside the `content={...}` prop)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — purely a wrapping `<div>` around existing markup.

- [ ] **Step 1: Wrap the table**

In `src/components/vehicle-selector/type-table.tsx`, the `content` prop currently reads (relevant slice, full block runs from the opening `<Table>` on the line after `) : (` through the matching `</Table>`):

```tsx
        ) : (
          <Table>
            <TableHeader>
```

... (existing table body, unchanged) ...

```tsx
          </Table>
        )
```

Change it to wrap the `<Table>` in a scroll container:

```tsx
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
```

... (existing table body content, indentation increased by two spaces to stay inside the new wrapping `<div>`, no other changes) ...

```tsx
            </Table>
          </div>
        )
```

Every line between the old `<Table>` and `</Table>` tags gets exactly one extra level of indentation (two spaces) since it now sits one level deeper inside the new `<div>`. No JSX content changes — same `<TableHeader>`, `<TableBody>`, columns, sort buttons, and rows as today.

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/vehicle-selector/type-table.tsx`
Expected: both commands exit with no errors and no output.

- [ ] **Step 3: Manual verification**

Use the `webapp-testing` skill. With the dev server running, navigate to a URL with a model that has several engine types, e.g. `http://localhost:3000/bg?categoryId=1&makeId=910052&modelId=9108817` (Audi A6 Allroad). Set viewport to 375×812. Confirm the table's outer `<div>` has `scrollWidth > clientWidth` (i.e., it actually needs to scroll) and that scrolling it horizontally reveals the later columns (power, capacity, cylinders, action button) without the table rows wrapping or the layout breaking. Then set viewport to 1440×900 and confirm the table renders exactly as it did before this task (no horizontal scrollbar, since content fits).

- [ ] **Step 4: Commit**

```bash
git add src/components/vehicle-selector/type-table.tsx
git commit -m "fix: make TypeTable scroll horizontally on narrow viewports"
```

---

### Task 4: Breadcrumb + search row mobile stacking

**Files:**
- Modify: `src/components/vehicle-selector/vehicle-selector.tsx:239-260` (the breadcrumb chip row)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — purely a restructuring of existing JSX/classes.

Current block (in the returned JSX of `VehicleSelector`):

```tsx
      <div className="flex flex-wrap items-center gap-2">
        {make && (
          <BreadcrumbChip
            label={make.makeName}
            imageUrl={make.imageUrlSmall}
            onClear={clearFromMake}
          />
        )}
        {model && (
          <BreadcrumbChip
            label={model.modelName}
            imageUrl={model.imageUrlSmall}
            onClear={clearFromModel}
          />
        )}
        {typeId != null && typeLabel && (
          <BreadcrumbChip label={typeLabel} onClear={clearFromType} />
        )}
        <div className="ml-auto w-full max-w-xs">
          <SearchBox onSelectResult={selectSearchResult} />
        </div>
      </div>
```

- [ ] **Step 1: Restructure into a chips group + a separately-stacking search box**

Replace the block above with:

```tsx
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {make && (
            <BreadcrumbChip
              label={make.makeName}
              imageUrl={make.imageUrlSmall}
              onClear={clearFromMake}
            />
          )}
          {model && (
            <BreadcrumbChip
              label={model.modelName}
              imageUrl={model.imageUrlSmall}
              onClear={clearFromModel}
            />
          )}
          {typeId != null && typeLabel && (
            <BreadcrumbChip label={typeLabel} onClear={clearFromType} />
          )}
        </div>
        <div className="w-full md:ml-auto md:w-auto md:max-w-xs">
          <SearchBox onSelectResult={selectSearchResult} />
        </div>
      </div>
```

The outer container switches from a single `flex flex-wrap` row to `flex flex-col` (mobile) / `flex-row items-center` (desktop, `md:`). The chips now live in their own inner `flex flex-wrap` row so they keep wrapping together instead of each becoming its own full-width row. The search box wrapper is `w-full` (full-width block) on mobile and reverts to `md:ml-auto md:w-auto md:max-w-xs` (pinned right, capped width) on desktop — pixel-identical to today's layout at `≥ md`.

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/vehicle-selector/vehicle-selector.tsx`
Expected: both commands exit with no errors and no output.

- [ ] **Step 3: Manual verification**

Use the `webapp-testing` skill. Navigate to `http://localhost:3000/bg?categoryId=1&makeId=910052` so at least one breadcrumb chip ("Audi (EU)") is present. Set viewport to 375×812: confirm the chip row and the search input box appear on two visually separate lines, with the search box spanning the full content width. Set viewport to 1440×900: confirm the chip(s) and the search box render in a single row with the search box right-aligned and width-capped, exactly as before this task.

- [ ] **Step 4: Commit**

```bash
git add src/components/vehicle-selector/vehicle-selector.tsx
git commit -m "fix: stack breadcrumb chips and search box on mobile"
```

---

### Task 5: MakeGrid mobile column tuning

**Files:**
- Modify: `src/components/vehicle-selector/make-grid.tsx:44` (loading skeleton grid)
- Modify: `src/components/vehicle-selector/make-grid.tsx:69` (populated grid)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — a class-string change on two already-identical `<div>` elements.

- [ ] **Step 1: Change the base column count**

In `src/components/vehicle-selector/make-grid.tsx`, both occurrences of:

```tsx
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
```

(one inside the `loading || !data` skeleton block at line 44, one inside `content={...}` at line 69) become:

```tsx
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
```

Only `grid-cols-4` → `grid-cols-3` changes; `sm:grid-cols-6 lg:grid-cols-8` stays exactly as-is on both lines.

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/vehicle-selector/make-grid.tsx`
Expected: both commands exit with no errors and no output.

- [ ] **Step 3: Manual verification**

Use the `webapp-testing` skill. Navigate to `http://localhost:3000/bg?categoryId=1` (Cars, populated `MakeGrid`). Set viewport to 375×812: confirm exactly 3 make tiles render per row. Set viewport to 700×900 (between `sm` and `md`): confirm 6 tiles per row (unchanged `sm:grid-cols-6`). Set viewport to 1440×900: confirm 8 tiles per row (unchanged `lg:grid-cols-8`).

- [ ] **Step 4: Commit**

```bash
git add src/components/vehicle-selector/make-grid.tsx
git commit -m "fix: give MakeGrid tiles more room on narrow mobile widths"
```
