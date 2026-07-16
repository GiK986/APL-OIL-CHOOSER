# Fuchs Results Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the results page (accordion per vehicle component, grouped
by OEM usage indication, 3-per-row product grid, vehicle-info sidebar) and
add a category-filtered "previous searches" list to the Make step's sidebar
— both over data we already fetch from our own Fuchs/Olyslager backend, no
API changes.

**Architecture:** Pure presentation-layer change. New small, single-purpose
components under `src/components/results/` replace the current
Card+Table-based results rendering; a new `groupProductsByUse` pure function
does the client-side grouping the old `useName` filter dropdown used to do
differently. A new `src/lib/recent-searches.ts` + `use-recent-searches.ts`
hook add a localStorage-backed history, consumed only by `MakeGrid` and
`VehicleSelector`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
v4, shadcn `base-nova` style on `@base-ui/react` primitives, `next-intl` for
i18n, Node's built-in `node --test` + `node:assert/strict` for unit tests.

## Global Constraints

- No changes to `/api/olyslager/*` routes or `src/lib/olyslager/client.ts` —
  every field this design needs is already returned by the existing
  recommendations endpoint.
- No packaging/pack-size display and no "More information" product link —
  `salesItems` and `productUrl` are always empty in the `fuchs_eu` dataset
  (confirmed against live data during design); don't build UI for data that
  doesn't exist.
- Everything styled with the project's own design system (existing
  shadcn/`ui/` primitives, current color/typography) — no visual copying of
  Eurol, only the structural layout idea (accordion + grouped product grid +
  sidebar).
- Full test suite command: `node --test src/**/*.test.ts` (run from repo
  root). Typecheck command: `npx tsc --noEmit`. Lint command: `npm run
  lint`. All three are clean on the current `main` branch — treat any
  failure introduced by a task's own changes as that task's bug to fix
  before committing.
- Test files import types with `import type { ... } from "@/lib/olyslager/types"`
  — Node's built-in TS type-stripping (this project's Node is v24, no
  transpiler/test runner dependency) erases type-only imports entirely, so
  the `@/` path alias never needs to resolve at test-run time. Runtime
  (value) imports across files always use relative paths with the `.ts`
  extension (e.g. `from "./derive-step.ts"`), matching every existing test
  in this repo.

---

## File Structure

```
src/lib/olyslager/types.ts          [MODIFY] add productImage field
src/lib/recent-searches.ts          [NEW] localStorage read/write, pure
src/lib/recent-searches.test.ts     [NEW]
src/hooks/use-recent-searches.ts    [NEW] client hook wrapping the above

src/components/ui/accordion.tsx     [NEW] shadcn/base-ui primitive

src/components/results/
  group-products-by-use.ts          [NEW] pure grouping function
  group-products-by-use.test.ts     [NEW]
  product-card.tsx                  [NEW]
  product-grid.tsx                  [NEW]
  product-use-section.tsx           [NEW]
  component-accordion.tsx           [NEW] replaces component-card.tsx
  vehicle-sidebar-card.tsx          [NEW] replaces vehicle-header-card.tsx
  component-card.tsx                [DELETE]
  vehicle-header-card.tsx           [DELETE]
  product-recommendation-table.tsx  [DELETE]
  capacities-list.tsx               [DELETE]

src/components/vehicle-selector/
  results-panel.tsx                 [MODIFY] two-column layout
  make-grid.tsx                     [MODIFY] renders RecentSearchesList
  vehicle-selector.tsx              [MODIFY] jumpToType, recent-searches wiring
  recent-searches-list.tsx          [NEW]
  product-use-filter.ts             [DELETE]
  product-use-filter.test.ts        [DELETE]

src/messages/en.json                [MODIFY]
src/messages/bg.json                [MODIFY]
```

---

## Task 1: Add the Accordion UI primitive

**Files:**
- Create: `src/components/ui/accordion.tsx`

**Interfaces:**
- Produces: `Accordion`, `AccordionItem`, `AccordionTrigger`,
  `AccordionContent` — same names/shape as every other shadcn primitive in
  `src/components/ui/` (`Card`, `Badge`, etc.), built on `@base-ui/react/accordion`.
  `AccordionItem`'s `value` prop accepts `any` (per `@base-ui/react`'s own
  types) — later tasks pass a numeric `component.id`.

This is the exact output of `npx shadcn@latest add accordion` for this
project's `components.json` (style `base-nova`, already verified during
planning — the `tw-animate-css` dependency already in `package.json`
supplies the `animate-accordion-down`/`animate-accordion-up` keyframes this
file references, so no `globals.css` changes are needed).

- [ ] **Step 1: Create the file**

```tsx
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring aria-disabled:pointer-events-none aria-disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon data-slot="accordion-trigger-icon" className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden" />
        <ChevronUpIcon data-slot="accordion-trigger-icon" className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "h-(--accordion-panel-height) pt-0 pb-2.5 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this file has no consumers yet, so it only needs to
compile standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/accordion.tsx
git commit -m "feat: add accordion UI primitive"
```

---

## Task 2: `groupProductsByUse` pure function

**Files:**
- Create: `src/components/results/group-products-by-use.ts`
- Test: `src/components/results/group-products-by-use.test.ts`

**Interfaces:**
- Consumes: `ProductRecommendation` (existing, from
  `@/lib/olyslager/types`: `{ productAppOrder, productName, productCode,
  temperatureName, useAppOrder, useName, intervals, approvalClassifications
  }`, `ProductInterval` (`{ appOrder, intervalName, intervalType }`).
- Produces: `ProductUseGroup` interface and `groupProductsByUse(products:
  ProductRecommendation[]): ProductUseGroup[]`, both exported — Task 4
  (`ComponentAccordion`) imports both.

```ts
export interface ProductUseGroup {
  useName: string;
  useAppOrder: number;
  intervals: ProductInterval[];
  products: ProductRecommendation[];
}
```

Products with a `null`/empty `useName` are grouped under the literal string
`"Normal"` — every product observed in the live dataset has a `useName`, but
the type allows `null`, and grouping must not silently drop such a product.

- [ ] **Step 1: Write the failing test**

```ts
// src/components/results/group-products-by-use.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { groupProductsByUse } from "./group-products-by-use.ts";
import type { ProductRecommendation } from "@/lib/olyslager/types";

function makeProduct(overrides: Partial<ProductRecommendation> = {}): ProductRecommendation {
  return {
    productAppOrder: 1,
    productName: "Test Product",
    productCode: null,
    productImage: null,
    temperatureName: null,
    useAppOrder: 1,
    useName: "Normal",
    intervals: [{ appOrder: 1, intervalName: "15000 km/ 12 months", intervalType: "Change" }],
    approvalClassifications: null,
    ...overrides,
  };
}

test("groups products by useName", () => {
  const products = [
    makeProduct({ productName: "A", useName: "Normal", useAppOrder: 1 }),
    makeProduct({ productName: "B", useName: "Extended drain (max)", useAppOrder: 3511 }),
    makeProduct({ productName: "C", useName: "Normal", useAppOrder: 1 }),
  ];
  const groups = groupProductsByUse(products);
  assert.equal(groups.length, 2);
  const normal = groups.find((g) => g.useName === "Normal")!;
  assert.deepEqual(normal.products.map((p) => p.productName), ["A", "C"]);
});

test("orders groups by useAppOrder ascending", () => {
  const products = [
    makeProduct({ productName: "A", useName: "Extended drain (max)", useAppOrder: 3511 }),
    makeProduct({ productName: "B", useName: "Normal", useAppOrder: 1 }),
  ];
  const groups = groupProductsByUse(products);
  assert.deepEqual(groups.map((g) => g.useName), ["Normal", "Extended drain (max)"]);
});

test("preserves incoming product order within a group", () => {
  const products = [
    makeProduct({ productName: "First", useName: "Normal", useAppOrder: 1 }),
    makeProduct({ productName: "Second", useName: "Normal", useAppOrder: 1 }),
    makeProduct({ productName: "Third", useName: "Normal", useAppOrder: 1 }),
  ];
  const groups = groupProductsByUse(products);
  assert.deepEqual(groups[0].products.map((p) => p.productName), ["First", "Second", "Third"]);
});

test("takes the group's intervals from its first product", () => {
  const intervalsA = [{ appOrder: 1, intervalName: "30000 km/ 24 months", intervalType: "Change" }];
  const products = [
    makeProduct({ productName: "A", useName: "Extended drain (max)", useAppOrder: 3511, intervals: intervalsA }),
    makeProduct({ productName: "B", useName: "Extended drain (max)", useAppOrder: 3511, intervals: [] }),
  ];
  const groups = groupProductsByUse(products);
  assert.deepEqual(groups[0].intervals, intervalsA);
});

test("groups a null useName under the literal string \"Normal\"", () => {
  const products = [makeProduct({ productName: "A", useName: null, useAppOrder: 1 })];
  const groups = groupProductsByUse(products);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].useName, "Normal");
});

test("returns an empty array for an empty input", () => {
  assert.deepEqual(groupProductsByUse([]), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/results/group-products-by-use.test.ts`
Expected: FAIL — `Cannot find module './group-products-by-use.ts'` (the
source file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```ts
// src/components/results/group-products-by-use.ts
import type { ProductInterval, ProductRecommendation } from "@/lib/olyslager/types";

export interface ProductUseGroup {
  useName: string;
  useAppOrder: number;
  intervals: ProductInterval[];
  products: ProductRecommendation[];
}

export function groupProductsByUse(products: ProductRecommendation[]): ProductUseGroup[] {
  const groups = new Map<string, ProductUseGroup>();

  for (const product of products) {
    const useName = product.useName ?? "Normal";
    const existing = groups.get(useName);
    if (existing) {
      existing.products.push(product);
    } else {
      groups.set(useName, {
        useName,
        useAppOrder: product.useAppOrder,
        intervals: product.intervals,
        products: [product],
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.useAppOrder - b.useAppOrder);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/results/group-products-by-use.test.ts`
Expected: `tests 6`, `pass 6`, `fail 0`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (This will fail until Task 3's `productImage` field
exists on `ProductRecommendation` — if Task 3 hasn't run yet, the
`makeProduct` helper's `productImage: null` will error. Do Task 3 first if
running these out of order, or accept the type error here and let Task 3
fix it. Tasks in this plan are meant to run in order.)

- [ ] **Step 6: Commit**

```bash
git add src/components/results/group-products-by-use.ts src/components/results/group-products-by-use.test.ts
git commit -m "feat: add groupProductsByUse for results-page product grouping"
```

---

## Task 3: Product display components

**Files:**
- Modify: `src/lib/olyslager/types.ts`
- Create: `src/components/results/product-card.tsx`
- Create: `src/components/results/product-grid.tsx`
- Create: `src/components/results/product-use-section.tsx`

**Interfaces:**
- Consumes: `ProductUseGroup` from Task 2
  (`group-products-by-use.ts`), `ProductRecommendation` from
  `@/lib/olyslager/types`.
- Produces: `ProductCard({ product: ProductRecommendation })`,
  `ProductGrid({ products: ProductRecommendation[] })`,
  `ProductUseSection({ group: ProductUseGroup })` — Task 4
  (`ComponentAccordion`) renders one `ProductUseSection` per group.

No unit tests for these three — they're pure presentational JSX with no
branching logic worth a `node:test` (matching this codebase's existing
convention: no test files exist for `component-card.tsx`,
`vehicle-header-card.tsx`, `make-grid.tsx`, etc. either). Verified visually
in Task 6 once wired into a real page.

- [ ] **Step 1: Add the `productImage` field**

In `src/lib/olyslager/types.ts`, the `ProductRecommendation` interface
currently reads:

```ts
export interface ProductRecommendation {
  productAppOrder: number;
  productName: string;
  productCode: string | null;
  temperatureName: string | null;
  useAppOrder: number;
  useName: string | null;
  intervals: ProductInterval[];
  approvalClassifications: string[] | null;
}
```

Add `productImage` right after `productCode` (matches the field's position
in the raw API response):

```ts
export interface ProductRecommendation {
  productAppOrder: number;
  productName: string;
  productCode: string | null;
  productImage: string | null;
  temperatureName: string | null;
  useAppOrder: number;
  useName: string | null;
  intervals: ProductInterval[];
  approvalClassifications: string[] | null;
}
```

- [ ] **Step 2: Typecheck (expect two pre-existing call sites to break)**

Run: `npx tsc --noEmit`
Expected: errors in `src/components/vehicle-selector/product-use-filter.test.ts`
and `src/components/results/group-products-by-use.test.ts` (both build a
`ProductRecommendation` object literal missing the new required field).
Fix both by adding `productImage: null` to each file's `makeProduct` helper
default object (`product-use-filter.test.ts`'s `makeProduct` — the plan
deletes this file in Task 6, but it must typecheck until then;
`group-products-by-use.test.ts`'s `makeProduct` already includes
`productImage: null` from Task 2 Step 1 above, so only
`product-use-filter.test.ts` needs the one-line edit here).

In `src/components/vehicle-selector/product-use-filter.test.ts`, change:

```ts
function makeProduct(overrides: Partial<ProductRecommendation> = {}): ProductRecommendation {
  return {
    productAppOrder: 1,
    productName: "Test Product",
    productCode: null,
    temperatureName: null,
    useAppOrder: 1,
    useName: "Normal",
    intervals: [],
    approvalClassifications: null,
    ...overrides,
  };
}
```

to:

```ts
function makeProduct(overrides: Partial<ProductRecommendation> = {}): ProductRecommendation {
  return {
    productAppOrder: 1,
    productName: "Test Product",
    productCode: null,
    productImage: null,
    temperatureName: null,
    useAppOrder: 1,
    useName: "Normal",
    intervals: [],
    approvalClassifications: null,
    ...overrides,
  };
}
```

Run `npx tsc --noEmit` again.
Expected: no errors.

- [ ] **Step 3: Create `ProductCard`**

```tsx
// src/components/results/product-card.tsx
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProductRecommendation } from "@/lib/olyslager/types";

const FALLBACK_IMAGE = "/products/fuchs-no-image.jpg";

export function ProductCard({ product }: { product: ProductRecommendation }) {
  return (
    <Card size="sm">
      <div className="flex justify-center p-3">
        <Image
          src={product.productImage || FALLBACK_IMAGE}
          alt={product.productName}
          width={96}
          height={96}
          className="h-24 w-24 object-contain"
        />
      </div>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm font-medium">{product.productName}</p>
        {product.productCode && (
          <Badge variant="outline" className="w-fit">
            {product.productCode}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create `ProductGrid`**

```tsx
// src/components/results/product-grid.tsx
import { ProductCard } from "./product-card";
import type { ProductRecommendation } from "@/lib/olyslager/types";

export function ProductGrid({ products }: { products: ProductRecommendation[] }) {
  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => (
        <ProductCard key={`${product.productCode ?? product.productName}-${index}`} product={product} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create `ProductUseSection`**

```tsx
// src/components/results/product-use-section.tsx
import { useTranslations } from "next-intl";
import { ProductGrid } from "./product-grid";
import type { ProductUseGroup } from "./group-products-by-use";

export function ProductUseSection({ group }: { group: ProductUseGroup }) {
  const t = useTranslations("Results");
  const intervalsSummary = group.intervals
    .map((interval) => `${interval.intervalType} ${interval.intervalName}`)
    .join(" | ");

  return (
    <div className="mb-4 last:mb-0">
      <p className="text-sm font-semibold">{group.useName}</p>
      {intervalsSummary && (
        <p className="mb-2 text-xs text-muted-foreground">
          {t("changeInterval")}: {intervalsSummary}
        </p>
      )}
      <ProductGrid products={group.products} />
    </div>
  );
}
```

- [ ] **Step 6: Typecheck and run the full test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `node --test src/**/*.test.ts`
Expected: all existing tests still pass (count unchanged from before this
task other than Task 2's new 6 tests already added).

- [ ] **Step 7: Commit**

```bash
git add src/lib/olyslager/types.ts src/components/results/product-card.tsx src/components/results/product-grid.tsx src/components/results/product-use-section.tsx src/components/vehicle-selector/product-use-filter.test.ts
git commit -m "feat: add ProductCard/ProductGrid/ProductUseSection and productImage field"
```

---

## Task 4: `ComponentAccordion`

**Files:**
- Create: `src/components/results/component-accordion.tsx`

**Interfaces:**
- Consumes: `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent`
  (Task 1), `groupProductsByUse` (Task 2), `ProductUseSection` (Task 3),
  `RecommendationComponent` (existing type).
- Produces: `ComponentAccordion({ component: RecommendationComponent })`,
  returning a single `<AccordionItem>` — Task 6 (`ResultsPanel`) renders one
  per component inside its own `<Accordion>` wrapper (so this component does
  **not** render its own `<Accordion>` root, only the item).

No unit test (presentational, verified in Task 6).

- [ ] **Step 1: Create the file**

```tsx
// src/components/results/component-accordion.tsx
import { useTranslations } from "next-intl";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ProductUseSection } from "./product-use-section";
import { groupProductsByUse } from "./group-products-by-use";
import type { Capacity, RecommendationComponent } from "@/lib/olyslager/types";

function formatCapacitiesSummary(capacities: Capacity[]): string {
  return capacities
    .map((capacity) => {
      const condition = capacity.condition ? ` (${capacity.condition})` : "";
      return `${capacity.item} ${capacity.value} ${capacity.unit}${condition}`;
    })
    .join(" | ");
}

export function ComponentAccordion({ component }: { component: RecommendationComponent }) {
  const t = useTranslations("Results");
  const hasContent = component.productRecommendations.length > 0 || component.capacities.length > 0;
  const capacitiesSummary = formatCapacitiesSummary(component.capacities);
  const groups = groupProductsByUse(component.productRecommendations);

  return (
    <AccordionItem value={component.id}>
      <AccordionTrigger>
        <span className="flex flex-col items-start gap-1">
          <span className="flex items-center gap-2">
            {component.componentName}
            {component.componentCode && (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {component.componentCode}
              </Badge>
            )}
          </span>
          {capacitiesSummary && (
            <span className="text-xs font-normal text-muted-foreground">{capacitiesSummary}</span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {hasContent ? (
          groups.map((group) => <ProductUseSection key={group.useName} group={group} />)
        ) : (
          <p className="text-sm text-muted-foreground">{t("noComponents")}</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/results/component-accordion.tsx
git commit -m "feat: add ComponentAccordion"
```

---

## Task 5: `VehicleSidebarCard`

**Files:**
- Create: `src/components/results/vehicle-sidebar-card.tsx`

**Interfaces:**
- Consumes: `Recommendation` (existing type), `DataInEnglishNote` (existing,
  unchanged, from `./data-in-english-note`).
- Produces: `VehicleSidebarCard({ vehicle: Recommendation })` — Task 6
  (`ResultsPanel`) renders it in the sidebar column.

Same fields as today's `VehicleHeaderCard`, laid out vertically (image on
top, centered) instead of horizontally, to fit a narrow sidebar column
instead of a full-width header.

- [ ] **Step 1: Create the file**

```tsx
// src/components/results/vehicle-sidebar-card.tsx
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataInEnglishNote } from "./data-in-english-note";
import type { Recommendation } from "@/lib/olyslager/types";

export function VehicleSidebarCard({ vehicle }: { vehicle: Recommendation }) {
  const image = vehicle.modelImageUrlLarge ?? vehicle.makeImageUrlLarge;

  return (
    <Card>
      {image && (
        <div className="flex justify-center px-4 pt-2">
          <Image
            src={image}
            alt={vehicle.modelName}
            width={160}
            height={120}
            className="h-auto max-h-[120px] w-auto object-contain"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-base">
          {vehicle.makeName} {vehicle.modelName} — {vehicle.typeName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {vehicle.yearStart}
            {vehicle.yearEnd ? `–${vehicle.yearEnd}` : "+"}
          </Badge>
          {vehicle.fuel && <Badge variant="secondary">{vehicle.fuel}</Badge>}
          {vehicle.driveType && <Badge variant="secondary">{vehicle.driveType}</Badge>}
          {(vehicle.powerHP || vehicle.powerKW) && (
            <Badge variant="secondary">
              {vehicle.powerHP} HP / {vehicle.powerKW} kW
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <DataInEnglishNote />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/results/vehicle-sidebar-card.tsx
git commit -m "feat: add VehicleSidebarCard"
```

---

## Task 6: `ResultsPanel` redesign

**Files:**
- Modify: `src/components/vehicle-selector/results-panel.tsx`
- Delete: `src/components/results/component-card.tsx`
- Delete: `src/components/results/vehicle-header-card.tsx`
- Delete: `src/components/results/product-recommendation-table.tsx`
- Delete: `src/components/results/capacities-list.tsx`
- Delete: `src/components/vehicle-selector/product-use-filter.ts`
- Delete: `src/components/vehicle-selector/product-use-filter.test.ts`
- Modify: `src/messages/en.json`, `src/messages/bg.json`

**Interfaces:**
- Consumes: `Accordion` (Task 1), `ComponentAccordion` (Task 4),
  `VehicleSidebarCard` (Task 5), existing `useOlyslagerResource` hook.
- Produces: `ResultsPanel({ typeId: number, onLoaded?: (rec: Recommendation)
  => void })` — same public signature as today, `vehicle-selector.tsx`
  (Task 10) doesn't need any prop-shape change here.

- [ ] **Step 1: Replace `results-panel.tsx`**

Current file imports and uses `FilterableStepLayout`, `ComponentCard`,
`extractUseNames`/`filterComponentsByUseName`, and a local `useName` filter
`useState`. Replace the whole file with:

```tsx
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useOlyslagerResource } from "@/hooks/use-olyslager-resource";
import { VehicleSidebarCard } from "@/components/results/vehicle-sidebar-card";
import { ComponentAccordion } from "@/components/results/component-accordion";
import { Accordion } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/lib/olyslager/types";

interface ResultsPanelProps {
  typeId: number;
  onLoaded?: (recommendation: Recommendation) => void;
}

export function ResultsPanel({ typeId, onLoaded }: ResultsPanelProps) {
  const t = useTranslations("Results");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerResource<Recommendation>(
    `/api/olyslager/recommendations/${typeId}`,
  );

  useEffect(() => {
    if (data) onLoaded?.(data);
  }, [data, onLoaded]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>{tc("error")}</span>
          <Button size="sm" variant="outline" onClick={retry}>
            {tc("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-64 w-full lg:w-64 lg:shrink-0" />
      </div>
    );
  }

  if (data.components.length === 0) {
    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1">
          <Alert>
            <AlertDescription>{t("noComponents")}</AlertDescription>
          </Alert>
        </div>
        <aside className="lg:w-64 lg:shrink-0">
          <VehicleSidebarCard vehicle={data} />
        </aside>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <div className="min-w-0 flex-1">
        <Accordion multiple defaultValue={[data.components[0].id]}>
          {data.components.map((component) => (
            <ComponentAccordion key={component.id} component={component} />
          ))}
        </Accordion>
      </div>
      <aside className="lg:w-64 lg:shrink-0">
        <VehicleSidebarCard vehicle={data} />
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Delete the now-unused files**

```bash
git rm src/components/results/component-card.tsx
git rm src/components/results/vehicle-header-card.tsx
git rm src/components/results/product-recommendation-table.tsx
git rm src/components/results/capacities-list.tsx
git rm src/components/vehicle-selector/product-use-filter.ts
git rm src/components/vehicle-selector/product-use-filter.test.ts
```

- [ ] **Step 3: Remove unused i18n keys**

In `src/messages/en.json`, the `Results` block currently reads:

```json
  "Results": {
    "recommendedProducts": "Recommended products",
    "capacities": "Capacities",
    "changeInterval": "Change interval",
    "productColumn": "Product",
    "codeColumn": "Code",
    "useColumn": "Use",
    "noComponents": "No recommendations available for this vehicle",
    "dataLanguageNote": "Vehicle and product data is provided in English.",
    "useFilterLabel": "Use"
  },
```

Replace with (keeps only the three keys still referenced —
`changeInterval` by `ProductUseSection`, `noComponents` by
`ComponentAccordion`/`ResultsPanel`, `dataLanguageNote` by
`DataInEnglishNote`):

```json
  "Results": {
    "changeInterval": "Change interval",
    "noComponents": "No recommendations available for this vehicle",
    "dataLanguageNote": "Vehicle and product data is provided in English."
  },
```

In `src/messages/bg.json`, the `Results` block currently reads:

```json
  "Results": {
    "recommendedProducts": "Препоръчани продукти",
    "capacities": "Капацитети",
    "changeInterval": "Интервал на смяна",
    "productColumn": "Продукт",
    "codeColumn": "Код",
    "useColumn": "Приложение",
    "noComponents": "Няма налични препоръки за това превозно средство",
    "dataLanguageNote": "Данните за автомобила и продуктите са налични само на английски език.",
    "useFilterLabel": "Приложение"
  },
```

Replace with:

```json
  "Results": {
    "changeInterval": "Интервал на смяна",
    "noComponents": "Няма налични препоръки за това превозно средство",
    "dataLanguageNote": "Данните за автомобила и продуктите са налични само на английски език."
  },
```

- [ ] **Step 4: Typecheck, lint, and run the full test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no errors.

Run: `node --test src/**/*.test.ts`
Expected: all pass — note the deleted `product-use-filter.test.ts` means
the total test count drops by 4 from before Task 6 (29 baseline + 6 from
Task 2 − 4 deleted = 31).

- [ ] **Step 5: Manual verification**

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000/en?categoryId=1&makeId=910052&modelId=9108819&typeId=89432`
in a browser (this is the Audi A6 2.0 TFSI (162 kW) vehicle used throughout
this feature's design — confirmed to return 7 diverse components: Engine,
two Transmission sub-parts, Transmission CVT, Differential CVT, Hydraulic
brake system, Cooling system).

Confirm:
- The page shows an accordion with 7 section headers, each showing the
  component name + code badge + a one-line capacity summary (e.g. "Capacity
  4,6 liter (Service fill)" under "Engine").
- The Engine section is expanded by default; the rest are collapsed.
- Expanding a section shows one or more usage-group headings (e.g. "Normal",
  "Extended drain (max)") each followed by a "Change interval: Change ..."
  line and a grid of product cards.
- Each product card shows the Fuchs placeholder image
  (`/products/fuchs-no-image.jpg`), the product name, and a code badge.
- On a desktop-width window the product grid shows 3 cards per row; narrow
  the window and confirm it drops to 2, then 1.
- A vehicle info card appears in a right-hand sidebar (photo, "Audi (EU) A6,
  S6, RS 6 — A6 2.0 TFSI (162 kW)", year/fuel/drive-type/power badges).

Stop the dev server (`Ctrl+C`) once confirmed.

- [ ] **Step 6: Commit**

```bash
git add src/components/vehicle-selector/results-panel.tsx src/messages/en.json src/messages/bg.json
git commit -m "feat: redesign results page as accordion + product grid + sidebar"
```

---

## Task 7: `recent-searches.ts`

**Files:**
- Create: `src/lib/recent-searches.ts`
- Test: `src/lib/recent-searches.test.ts`

**Interfaces:**
- Produces: `RecentSearchEntry` interface, `getRecentSearches():
  RecentSearchEntry[]`, `addRecentSearch(entry: RecentSearchEntry):
  RecentSearchEntry[]` — Task 8 (`use-recent-searches.ts`) calls both; Task
  9/10 build `RecentSearchEntry` objects from a `Recommendation`.

```ts
export interface RecentSearchEntry {
  typeId: number;
  categoryId: number;
  categoryName: string;
  makeName: string;
  modelName: string;
  typeName: string;
  yearStart: number;
  yearEnd: number | null;
}
```

Guards every `localStorage` access with `typeof localStorage ===
"undefined"` — this is `true` both during Next.js server-side rendering
(no `localStorage` global in Node) and in this file's own `node:test` run
(same reason), and safely `false` in an actual browser or once a test
installs a stub on `globalThis.localStorage`. `typeof` on an undeclared
identifier never throws (a JS-native guarantee), so this check is safe
without needing to reference `window` first.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/recent-searches.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getRecentSearches, addRecentSearch, type RecentSearchEntry } from "./recent-searches.ts";

function installFakeLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };
}

function makeEntry(overrides: Partial<RecentSearchEntry> = {}): RecentSearchEntry {
  return {
    typeId: 1,
    categoryId: 1,
    categoryName: "Cars",
    makeName: "Audi (EU)",
    modelName: "A6, S6, RS 6",
    typeName: "A6 2.0 TFSI (162 kW)",
    yearStart: 2011,
    yearEnd: 2014,
    ...overrides,
  };
}

beforeEach(() => {
  installFakeLocalStorage();
});

test("getRecentSearches returns an empty array when nothing stored", () => {
  assert.deepEqual(getRecentSearches(), []);
});

test("addRecentSearch persists an entry retrievable via getRecentSearches", () => {
  const entry = makeEntry();
  addRecentSearch(entry);
  assert.deepEqual(getRecentSearches(), [entry]);
});

test("addRecentSearch puts the newest entry first", () => {
  addRecentSearch(makeEntry({ typeId: 1, typeName: "First" }));
  addRecentSearch(makeEntry({ typeId: 2, typeName: "Second" }));
  const all = getRecentSearches();
  assert.equal(all[0].typeName, "Second");
  assert.equal(all[1].typeName, "First");
});

test("addRecentSearch dedupes by typeId, moving the re-added entry to the front", () => {
  addRecentSearch(makeEntry({ typeId: 1, typeName: "First" }));
  addRecentSearch(makeEntry({ typeId: 2, typeName: "Second" }));
  addRecentSearch(makeEntry({ typeId: 1, typeName: "First again" }));
  const all = getRecentSearches();
  assert.equal(all.length, 2);
  assert.equal(all[0].typeName, "First again");
  assert.equal(all[1].typeName, "Second");
});

test("addRecentSearch caps the list at 20 entries", () => {
  for (let i = 0; i < 25; i++) {
    addRecentSearch(makeEntry({ typeId: i, typeName: `Type ${i}` }));
  }
  const all = getRecentSearches();
  assert.equal(all.length, 20);
  assert.equal(all[0].typeName, "Type 24");
});

test("getRecentSearches returns an empty array when localStorage is unavailable", () => {
  delete (globalThis as { localStorage?: Storage }).localStorage;
  assert.deepEqual(getRecentSearches(), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/recent-searches.test.ts`
Expected: FAIL — `Cannot find module './recent-searches.ts'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/recent-searches.ts
export interface RecentSearchEntry {
  typeId: number;
  categoryId: number;
  categoryName: string;
  makeName: string;
  modelName: string;
  typeName: string;
  yearStart: number;
  yearEnd: number | null;
}

const STORAGE_KEY = "apl-oil-chooser:recent-searches";
const MAX_ENTRIES = 20;

export function getRecentSearches(): RecentSearchEntry[] {
  if (typeof localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RecentSearchEntry[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(entry: RecentSearchEntry): RecentSearchEntry[] {
  const deduped = getRecentSearches().filter((existing) => existing.typeId !== entry.typeId);
  const next = [entry, ...deduped].slice(0, MAX_ENTRIES);

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage can throw (quota exceeded, private-browsing restrictions) —
      // recent searches are a nice-to-have, never worth breaking the flow over.
    }
  }

  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/recent-searches.test.ts`
Expected: `tests 6`, `pass 6`, `fail 0`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/recent-searches.ts src/lib/recent-searches.test.ts
git commit -m "feat: add recent-searches localStorage module"
```

---

## Task 8: `useRecentSearches` hook + `RecentSearchesList`

**Files:**
- Create: `src/hooks/use-recent-searches.ts`
- Create: `src/components/vehicle-selector/recent-searches-list.tsx`
- Modify: `src/messages/en.json`, `src/messages/bg.json`

**Interfaces:**
- Consumes: `getRecentSearches`, `addRecentSearch`, `RecentSearchEntry`
  (Task 7).
- Produces: `useRecentSearches(): { entries: RecentSearchEntry[]; add:
  (entry: RecentSearchEntry) => void }` and `RecentSearchesList({ entries:
  RecentSearchEntry[]; onSelect: (entry: RecentSearchEntry) => void })` —
  Task 9 (`MakeGrid`) renders `RecentSearchesList`; Task 10
  (`VehicleSelector`) calls `useRecentSearches()`.

No unit test for either (the hook is a thin `useState`/`useEffect` wrapper
around already-tested pure functions; `RecentSearchesList` is
presentational) — verified in Task 10's manual end-to-end check.

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/use-recent-searches.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { addRecentSearch, getRecentSearches, type RecentSearchEntry } from "@/lib/recent-searches";

interface UseRecentSearchesResult {
  entries: RecentSearchEntry[];
  add: (entry: RecentSearchEntry) => void;
}

export function useRecentSearches(): UseRecentSearchesResult {
  const [entries, setEntries] = useState<RecentSearchEntry[]>([]);

  useEffect(() => {
    setEntries(getRecentSearches());
  }, []);

  const add = useCallback((entry: RecentSearchEntry) => {
    setEntries(addRecentSearch(entry));
  }, []);

  return { entries, add };
}
```

- [ ] **Step 2: Create `RecentSearchesList`**

```tsx
// src/components/vehicle-selector/recent-searches-list.tsx
"use client";

import { useTranslations } from "next-intl";
import type { RecentSearchEntry } from "@/lib/recent-searches";

interface RecentSearchesListProps {
  entries: RecentSearchEntry[];
  onSelect: (entry: RecentSearchEntry) => void;
}

export function RecentSearchesList({ entries, onSelect }: RecentSearchesListProps) {
  const t = useTranslations("VehiclePicker");

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{t("recentSearchesLabel")}</p>
      <ul className="flex flex-col gap-1">
        {entries.map((entry) => (
          <li key={entry.typeId}>
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className="w-full rounded-[3px] px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
            >
              <span className="block font-medium">
                {entry.makeName} {entry.modelName}
              </span>
              <span className="block text-muted-foreground">{entry.typeName}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Add the `recentSearchesLabel` i18n key**

In `src/messages/en.json`, in the `VehiclePicker` block, add
`"recentSearchesLabel": "Previous searches",` right after
`"filterByName": "Search by name",`:

```json
    "filterByName": "Search by name",
    "recentSearchesLabel": "Previous searches",
```

In `src/messages/bg.json`, in the `VehiclePicker` block, add
`"recentSearchesLabel": "Предишни търсения",` right after
`"filterByName": "Търсене по име",`:

```json
    "filterByName": "Търсене по име",
    "recentSearchesLabel": "Предишни търсения",
```

- [ ] **Step 4: Typecheck and run the full test suite**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `node --test src/**/*.test.ts`
Expected: all pass, count unchanged from Task 7 (this task adds no tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-recent-searches.ts src/components/vehicle-selector/recent-searches-list.tsx src/messages/en.json src/messages/bg.json
git commit -m "feat: add useRecentSearches hook and RecentSearchesList"
```

---

## Task 9: `MakeGrid` integration

**Files:**
- Modify: `src/components/vehicle-selector/make-grid.tsx`

**Interfaces:**
- Consumes: `RecentSearchesList` (Task 8), `RecentSearchEntry` (Task 7).
- Produces: `MakeGrid` now takes two new required props —
  `recentSearches: RecentSearchEntry[]` (the **full**, unfiltered list) and
  `onSelectRecentSearch: (entry: RecentSearchEntry) => void`. `MakeGrid`
  itself filters `recentSearches` down to the current `categoryId` before
  handing them to `RecentSearchesList` — this is the "filtered by category"
  behavior, and it's why the prop carries the unfiltered list rather than an
  already-filtered one. Task 10 (`VehicleSelector`) is the only caller and
  must pass both.

- [ ] **Step 1: Update `make-grid.tsx`**

Current file (`src/components/vehicle-selector/make-grid.tsx`) in full:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { matchesNameFilter } from "./name-filter";
import { sortByAppOrder } from "./sort-by-app-order";
import { FilterableStepLayout } from "./filterable-step-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Make } from "@/lib/olyslager/types";

interface MakeGridProps {
  categoryId: number;
  onSelect: (make: Make) => void;
}

export function MakeGrid({ categoryId, onSelect }: MakeGridProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerList<Make>(
    `/api/olyslager/makes?categoryId=${categoryId}`,
  );
  const [query, setQuery] = useState("");

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>{tc("error")}</span>
          <Button size="sm" variant="outline" onClick={retry}>
            {tc("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !data) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyMakes")}</p>;
  }

  const filtered = sortByAppOrder(data).filter((make) => matchesNameFilter(make.makeName, query));

  return (
    <FilterableStepLayout
      content={
        filtered.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{t("noMatches")}</p>
            <Button size="sm" variant="outline" onClick={() => setQuery("")}>
              {t("clearFilter")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {filtered.map((make) => (
              <button
                key={make.id}
                type="button"
                onClick={() => onSelect(make)}
                className="flex flex-col items-center gap-2 rounded-[3px] border border-border bg-card px-2 py-3 text-center transition-colors hover:border-primary"
              >
                {make.imageUrlMedium ? (
                  <Image
                    src={make.imageUrlMedium}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <div className="h-10 w-10" />
                )}
                <span className="text-xs font-medium">{make.makeName}</span>
              </button>
            ))}
          </div>
        )
      }
      filters={
        <div className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-3">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="make-name-filter">
            {t("filterByName")}
          </label>
          <Input
            id="make-name-filter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("filterByName")}
          />
        </div>
      }
    />
  );
}
```

Replace it with (three changes: new props in the interface/signature, a new
`categoryRecentSearches` computed value, and `filters` now renders both the
name-filter box and `RecentSearchesList` stacked with a gap):

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { matchesNameFilter } from "./name-filter";
import { sortByAppOrder } from "./sort-by-app-order";
import { FilterableStepLayout } from "./filterable-step-layout";
import { RecentSearchesList } from "./recent-searches-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Make } from "@/lib/olyslager/types";
import type { RecentSearchEntry } from "@/lib/recent-searches";

interface MakeGridProps {
  categoryId: number;
  onSelect: (make: Make) => void;
  recentSearches: RecentSearchEntry[];
  onSelectRecentSearch: (entry: RecentSearchEntry) => void;
}

export function MakeGrid({
  categoryId,
  onSelect,
  recentSearches,
  onSelectRecentSearch,
}: MakeGridProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerList<Make>(
    `/api/olyslager/makes?categoryId=${categoryId}`,
  );
  const [query, setQuery] = useState("");

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>{tc("error")}</span>
          <Button size="sm" variant="outline" onClick={retry}>
            {tc("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !data) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyMakes")}</p>;
  }

  const filtered = sortByAppOrder(data).filter((make) => matchesNameFilter(make.makeName, query));
  const categoryRecentSearches = recentSearches.filter((entry) => entry.categoryId === categoryId);

  return (
    <FilterableStepLayout
      content={
        filtered.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{t("noMatches")}</p>
            <Button size="sm" variant="outline" onClick={() => setQuery("")}>
              {t("clearFilter")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {filtered.map((make) => (
              <button
                key={make.id}
                type="button"
                onClick={() => onSelect(make)}
                className="flex flex-col items-center gap-2 rounded-[3px] border border-border bg-card px-2 py-3 text-center transition-colors hover:border-primary"
              >
                {make.imageUrlMedium ? (
                  <Image
                    src={make.imageUrlMedium}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <div className="h-10 w-10" />
                )}
                <span className="text-xs font-medium">{make.makeName}</span>
              </button>
            ))}
          </div>
        )
      }
      filters={
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-3">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="make-name-filter">
              {t("filterByName")}
            </label>
            <Input
              id="make-name-filter"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("filterByName")}
            />
          </div>
          <RecentSearchesList entries={categoryRecentSearches} onSelect={onSelectRecentSearch} />
        </div>
      }
    />
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: an error in `src/components/vehicle-selector/vehicle-selector.tsx`
— its existing `<MakeGrid categoryId={category.id} onSelect={selectMake}
/>` call is now missing the two new required props. This is expected and
fixed in Task 10 (the next task); confirm the error is exactly this one
missing-props error and nothing else, then move on.

- [ ] **Step 3: Commit**

```bash
git add src/components/vehicle-selector/make-grid.tsx
git commit -m "feat: render category-filtered recent searches in MakeGrid's sidebar"
```

---

## Task 10: `VehicleSelector` integration

**Files:**
- Modify: `src/components/vehicle-selector/vehicle-selector.tsx`

**Interfaces:**
- Consumes: `useRecentSearches` (Task 8), `RecentSearchEntry` (Task 7),
  `MakeGrid`'s new props (Task 9).
- Produces: no new exports — this is the final wiring task, and the
  deliverable is the fully working feature end-to-end.

- [ ] **Step 1: Add the recent-searches hook and update imports**

In `src/components/vehicle-selector/vehicle-selector.tsx`, the top of the
file currently reads:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { deriveStep } from "./derive-step";
import { BreadcrumbChip } from "./breadcrumb-chip";
import { CategoryGrid } from "./category-grid";
import { MakeGrid } from "./make-grid";
import { ModelGrid } from "./model-grid";
import { TypeTable } from "./type-table";
import { ResultsPanel } from "./results-panel";
import { SearchBox } from "@/components/search/search-box";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { Category, Make, Model, VehicleType, SearchResult } from "@/lib/olyslager/types";
```

Change the last two imports to add `Recommendation` and add the two new
recent-searches imports:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { deriveStep } from "./derive-step";
import { BreadcrumbChip } from "./breadcrumb-chip";
import { CategoryGrid } from "./category-grid";
import { MakeGrid } from "./make-grid";
import { ModelGrid } from "./model-grid";
import { TypeTable } from "./type-table";
import { ResultsPanel } from "./results-panel";
import { SearchBox } from "@/components/search/search-box";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { RecentSearchEntry } from "@/lib/recent-searches";
import type {
  Category,
  Make,
  Model,
  VehicleType,
  SearchResult,
  Recommendation,
} from "@/lib/olyslager/types";
```

- [ ] **Step 2: Add the hook call**

Right after the existing `const [typeLabel, setTypeLabel] =
useState<string | null>(null);` line (before the `hasInteracted` comment
block), add:

```tsx
  const { entries: recentSearches, add: addRecentSearch } = useRecentSearches();
```

- [ ] **Step 3: Add `jumpToType` and rewrite `selectSearchResult`**

The current `selectSearchResult` function reads:

```tsx
  function selectSearchResult(result: SearchResult) {
    setCategory(null);
    setMake(null);
    setModel(null);
    setTypeId(result.typeId);
    setTypeLabel(result.type);
    pushSelection({ categoryId: null, makeId: null, modelId: null, typeId: result.typeId });
  }
```

Replace it with a shared `jumpToType` helper plus a `selectSearchResult`
that calls it, and a new `handleResultsLoaded` that both records the search
and keeps the existing `setTypeLabel` behavior:

```tsx
  function jumpToType(id: number, label: string) {
    setCategory(null);
    setMake(null);
    setModel(null);
    setTypeId(id);
    setTypeLabel(label);
    pushSelection({ categoryId: null, makeId: null, modelId: null, typeId: id });
  }

  function selectSearchResult(result: SearchResult) {
    jumpToType(result.typeId, result.type);
  }

  function handleResultsLoaded(rec: Recommendation) {
    setTypeLabel(rec.typeName);
    addRecentSearch({
      typeId: rec.id,
      categoryId: rec.categoryId,
      categoryName: rec.categoryName,
      makeName: rec.makeName,
      modelName: rec.modelName,
      typeName: rec.typeName,
      yearStart: rec.yearStart,
      yearEnd: rec.yearEnd,
    });
  }
```

- [ ] **Step 4: Wire the new props into the render**

The current `MakeGrid` render line reads:

```tsx
      {step === "make" && category && !resolvingSelection && (
        <MakeGrid categoryId={category.id} onSelect={selectMake} />
      )}
```

Replace with:

```tsx
      {step === "make" && category && !resolvingSelection && (
        <MakeGrid
          categoryId={category.id}
          onSelect={selectMake}
          recentSearches={recentSearches}
          onSelectRecentSearch={(entry) => jumpToType(entry.typeId, entry.typeName)}
        />
      )}
```

The current `ResultsPanel` render line reads:

```tsx
      {step === "results" && typeId != null && (
        <ResultsPanel key={typeId} typeId={typeId} onLoaded={(rec) => setTypeLabel(rec.typeName)} />
      )}
```

Replace with:

```tsx
      {step === "results" && typeId != null && (
        <ResultsPanel key={typeId} typeId={typeId} onLoaded={handleResultsLoaded} />
      )}
```

- [ ] **Step 5: Typecheck, lint, and run the full test suite**

Run: `npx tsc --noEmit`
Expected: no errors (this resolves Task 9's expected error).

Run: `npm run lint`
Expected: no errors.

Run: `node --test src/**/*.test.ts`
Expected: all pass (31 tests: 29 baseline − 4 deleted with
`product-use-filter.test.ts` + 6 from Task 2 + 6 from Task 7 = 37; adjust
expectation to whatever the actual running total is at this point in a real
run — the point of this step is zero failures, not a specific magic number).

- [ ] **Step 6: Manual end-to-end verification**

Start the dev server:

```bash
npm run dev
```

In a browser, open `http://localhost:3000/en` and:

1. Click the "Cars" category, then click "Audi (EU)".
2. Confirm the sidebar next to the make grid shows "Search by name" — and,
   since this is a fresh browser profile with nothing in `localStorage`
   yet, no "Previous searches" block below it (it renders nothing when
   `entries.length === 0`).
3. Click through "A6, S6, RS 6" → any engine variant → confirm the
   redesigned accordion results page from Task 6 appears, and the search is
   now recorded.
4. Use the browser back button (or navigate to
   `http://localhost:3000/en?categoryId=1`) to return to the category step,
   click "Cars" again to reach the make grid.
5. Confirm a "Previous searches" list now appears under "Search by name" in
   the sidebar, showing the vehicle just viewed (e.g. "Audi (EU) A6, S6, RS
   6" / "A6 2.0 TFSI (162 kW)").
6. Click that entry. Confirm it navigates straight to that vehicle's
   results page (skipping make/model/type selection), the same page as
   step 3.
7. Pick a different category (e.g. "Motorcycles, Mopeds, ATV/UTV"), reach
   its make grid, and confirm the Cars search from step 3 does **not**
   appear in this category's "Previous searches" list (category filtering
   works).

Stop the dev server (`Ctrl+C`) once confirmed.

- [ ] **Step 7: Commit**

```bash
git add src/components/vehicle-selector/vehicle-selector.tsx
git commit -m "feat: wire recent-searches into VehicleSelector"
```

---

## Self-Review Notes

- **Spec coverage:** accordion redesign (Tasks 1, 3, 4, 5, 6), product
  image fallback (Task 3), grouping utility (Task 2), previous-searches
  list scoped to the Make step and filtered by category (Tasks 7–10),
  i18n cleanup (Tasks 6, 8) — every section of
  `docs/superpowers/specs/2026-07-16-fuchs-results-redesign-design.md` maps
  to a task above.
- **Type consistency check performed:** `ProductUseGroup`,
  `RecentSearchEntry`, `ComponentAccordion`/`ProductGrid`/`ProductCard`/
  `ProductUseSection`/`VehicleSidebarCard`/`RecentSearchesList` prop names
  and shapes were kept identical everywhere they're produced vs. consumed
  across tasks (verified while writing, not just declared).
- **Known deviation from the spec document's i18n section:** the spec
  listed `recommendedProducts` and `capacities` as keys that "stay" — this
  plan's actual component design (Task 3/4) doesn't render either (the
  accordion trigger's inline capacity summary replaces the `capacities`
  heading, and per-usage-group headings replace the `recommendedProducts`
  heading), so Task 6 removes both alongside the originally-planned
  `productColumn`/`codeColumn`/`useColumn`/`useFilterLabel`. This is a
  planning-time correction, not an open question — no action needed before
  execution.
