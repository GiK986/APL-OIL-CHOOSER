# Vehicle Selector Client-Side Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-side filters (name search on Make/Model, fuel/drive-type/power facets on the Type table, product-use filter on Results) shown in a right-side panel, with no new API calls.

**Architecture:** A new `FilterableStepLayout` presentational wrapper renders a two-column (content + `w-64` aside) layout when a `filters` node is supplied, or just the content when it isn't. Each existing self-fetching step component (`MakeGrid`, `ModelGrid`, `TypeTable`, `ResultsPanel`) gains its own local filter `useState` and calls a pure, independently-tested matching function to filter its already-loaded list before rendering, then wraps its return value in `FilterableStepLayout`. No portals, no context, no changes to `vehicle-selector.tsx` or the URL query-param state — filters are transient local UI state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, `node --test` for pure-function unit tests (existing project convention, see `derive-step.ts`/`derive-step.test.ts`).

## Global Constraints

- Filter state is local component state only — **never** written to the URL (the vehicle-selection ids already are; see `vehicle-selector.tsx`; filters must not touch that).
- The page container widens to a fixed `max-w-[1320px]` applied unconditionally on every step (not just when a panel is present) — this avoids the page reflowing width as the user moves between steps.
- The filter panel (the `aside`) only renders when the current step has a real filter to offer: absent entirely on the Category step (nothing to filter — enforced simply by `MakeGrid`/`ModelGrid`/`TypeTable`/`ResultsPanel` being the only components that render one, `CategoryGrid` never does), and absent on the Results step when there are fewer than 2 distinct `useName` values (a filter offering only "All" is not a real filter).
- Every filter's matching logic is a pure, exported, independently `node --test`-covered function in its own module — never inlined directly into a component's `.filter()` callback.
- New pure-function test files import their module with an explicit `.ts` extension (e.g. `from "./name-filter.ts"`) — required by this project's Node ESM resolver, same as the existing `derive-step.test.ts`. `tsconfig.json` already has `allowImportingTsExtensions: true` from earlier work, so `tsc --noEmit` accepts this without changes.
- Facet filters (fuel, drive type, results use-name) use a plain native `<select>` element styled to match `Input` (`h-8 w-full rounded-[3px] border border-input bg-transparent px-2 text-sm`) — **not** the shadcn/Base UI `Select` primitive. This project hit real bugs with Base UI `Select`'s value/label typing during the original picker build; a native `<select>` is simpler, has no such footguns, and is sufficient for a flat list of string options.
- No new runtime dependencies.
- `FilterableStepLayout` is plain presentational JSX with no logic to unit-test (an `if` on whether a prop was passed) — it has **no** test file, matching this codebase's existing convention where presentational components (`BreadcrumbChip`, `CategoryGrid`, etc.) have no dedicated tests and only pure non-JSX logic modules (`derive-step.ts`) do. `node --test` cannot run `.tsx` files (no JSX transform in the test runner) — do not attempt to test-run it.
- `bg.json` and `en.json` must stay structurally parallel — every new key added to one is added to the other in the same task.
- Reuse existing panel container styling (`rounded-[3px] border border-border bg-card p-3`) — same tokens as the rest of the app (see the redesign spec).

---

### Task 1: `matchesNameFilter` pure function

**Files:**
- Create: `src/components/vehicle-selector/name-filter.ts`
- Test: `src/components/vehicle-selector/name-filter.test.ts`

**Interfaces:**
- Produces: `matchesNameFilter(name: string, query: string): boolean` — used by Task 6 (`MakeGrid`, `ModelGrid`).

- [ ] **Step 1: Write the failing test**

```ts
// src/components/vehicle-selector/name-filter.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesNameFilter } from "./name-filter.ts";

test("empty query matches everything", () => {
  assert.equal(matchesNameFilter("Audi", ""), true);
});

test("whitespace-only query matches everything", () => {
  assert.equal(matchesNameFilter("Audi", "   "), true);
});

test("matches a case-insensitive substring", () => {
  assert.equal(matchesNameFilter("Audi", "aud"), true);
  assert.equal(matchesNameFilter("Audi", "AUD"), true);
});

test("does not match an unrelated query", () => {
  assert.equal(matchesNameFilter("Audi", "bmw"), false);
});

test("matches a substring in the middle of the name", () => {
  assert.equal(matchesNameFilter("Mercedes-Benz", "benz"), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/vehicle-selector/name-filter.test.ts`
Expected: FAIL — `Cannot find module './name-filter.ts'` (module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```ts
// src/components/vehicle-selector/name-filter.ts
export function matchesNameFilter(name: string, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  return name.toLowerCase().includes(trimmed);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/vehicle-selector/name-filter.test.ts`
Expected: `pass 5`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/components/vehicle-selector/name-filter.ts src/components/vehicle-selector/name-filter.test.ts
git commit -m "feat: add matchesNameFilter pure function for make/model name search"
```

---

### Task 2: `type-filters.ts` pure functions

**Files:**
- Create: `src/components/vehicle-selector/type-filters.ts`
- Test: `src/components/vehicle-selector/type-filters.test.ts`

**Interfaces:**
- Consumes: `VehicleType` from `@/lib/olyslager/types` (fields used: `fuel: string | null`, `driveType: string | null`, `powerHP: number | null`).
- Produces: `TypeFilters` interface `{ fuel: string | null; driveType: string | null; powerMin: number | null; powerMax: number | null }`, `EMPTY_TYPE_FILTERS: TypeFilters`, `extractDistinctValues(types: VehicleType[], key: "fuel" | "driveType"): string[]`, `matchesTypeFilters(type: VehicleType, filters: TypeFilters): boolean`, `hasActiveTypeFilters(filters: TypeFilters): boolean` — all used by Task 7 (`TypeTable`).

- [ ] **Step 1: Write the failing test**

```ts
// src/components/vehicle-selector/type-filters.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchesTypeFilters,
  extractDistinctValues,
  hasActiveTypeFilters,
  EMPTY_TYPE_FILTERS,
  type TypeFilters,
} from "./type-filters.ts";
import type { VehicleType } from "@/lib/olyslager/types";

function makeType(overrides: Partial<VehicleType> = {}): VehicleType {
  return {
    id: 1,
    appOrder: 1,
    typeName: "Test Type",
    code: null,
    yearStart: 2000,
    yearEnd: null,
    fuel: "Petrol",
    driveType: "FWD",
    cylinderCC: 2000,
    engineBuild: null,
    powerHP: 150,
    powerKW: 110,
    powerRPM: null,
    valveCount: null,
    cylinderCount: 4,
    modelImageUrlSmall: null,
    modelImageUrlMedium: null,
    modelImageUrlLarge: null,
    makeImageUrlSmall: null,
    makeImageUrlMedium: null,
    makeImageUrlLarge: null,
    ...overrides,
  };
}

test("matchesTypeFilters: EMPTY_TYPE_FILTERS matches everything", () => {
  assert.equal(matchesTypeFilters(makeType(), EMPTY_TYPE_FILTERS), true);
});

test("matchesTypeFilters: fuel filter excludes a non-matching type", () => {
  const filters: TypeFilters = { ...EMPTY_TYPE_FILTERS, fuel: "Diesel" };
  assert.equal(matchesTypeFilters(makeType({ fuel: "Petrol" }), filters), false);
  assert.equal(matchesTypeFilters(makeType({ fuel: "Diesel" }), filters), true);
});

test("matchesTypeFilters: driveType filter excludes a non-matching type", () => {
  const filters: TypeFilters = { ...EMPTY_TYPE_FILTERS, driveType: "AWD" };
  assert.equal(matchesTypeFilters(makeType({ driveType: "FWD" }), filters), false);
  assert.equal(matchesTypeFilters(makeType({ driveType: "AWD" }), filters), true);
});

test("matchesTypeFilters: power range excludes types outside the range", () => {
  const filters: TypeFilters = { ...EMPTY_TYPE_FILTERS, powerMin: 100, powerMax: 200 };
  assert.equal(matchesTypeFilters(makeType({ powerHP: 90 }), filters), false);
  assert.equal(matchesTypeFilters(makeType({ powerHP: 250 }), filters), false);
  assert.equal(matchesTypeFilters(makeType({ powerHP: 150 }), filters), true);
});

test("matchesTypeFilters: an open-ended power range only checks the given bound", () => {
  const minOnly: TypeFilters = { ...EMPTY_TYPE_FILTERS, powerMin: 100 };
  assert.equal(matchesTypeFilters(makeType({ powerHP: 500 }), minOnly), true);
  assert.equal(matchesTypeFilters(makeType({ powerHP: 50 }), minOnly), false);
});

test("matchesTypeFilters: a power range excludes types with no powerHP", () => {
  const filters: TypeFilters = { ...EMPTY_TYPE_FILTERS, powerMin: 100 };
  assert.equal(matchesTypeFilters(makeType({ powerHP: null }), filters), false);
});

test("hasActiveTypeFilters: false for EMPTY_TYPE_FILTERS, true once any field is set", () => {
  assert.equal(hasActiveTypeFilters(EMPTY_TYPE_FILTERS), false);
  assert.equal(hasActiveTypeFilters({ ...EMPTY_TYPE_FILTERS, fuel: "Diesel" }), true);
});

test("extractDistinctValues: dedupes, sorts, and skips null values", () => {
  const types = [
    makeType({ fuel: "Diesel" }),
    makeType({ fuel: "Petrol" }),
    makeType({ fuel: "Diesel" }),
    makeType({ fuel: null }),
  ];
  assert.deepEqual(extractDistinctValues(types, "fuel"), ["Diesel", "Petrol"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/vehicle-selector/type-filters.test.ts`
Expected: FAIL — `Cannot find module './type-filters.ts'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/components/vehicle-selector/type-filters.ts
import type { VehicleType } from "@/lib/olyslager/types";

export interface TypeFilters {
  fuel: string | null;
  driveType: string | null;
  powerMin: number | null;
  powerMax: number | null;
}

export const EMPTY_TYPE_FILTERS: TypeFilters = {
  fuel: null,
  driveType: null,
  powerMin: null,
  powerMax: null,
};

export function extractDistinctValues(
  types: VehicleType[],
  key: "fuel" | "driveType",
): string[] {
  const values = new Set<string>();
  for (const type of types) {
    const value = type[key];
    if (value) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function matchesTypeFilters(type: VehicleType, filters: TypeFilters): boolean {
  if (filters.fuel != null && type.fuel !== filters.fuel) return false;
  if (filters.driveType != null && type.driveType !== filters.driveType) return false;
  if (filters.powerMin != null && (type.powerHP == null || type.powerHP < filters.powerMin)) {
    return false;
  }
  if (filters.powerMax != null && (type.powerHP == null || type.powerHP > filters.powerMax)) {
    return false;
  }
  return true;
}

export function hasActiveTypeFilters(filters: TypeFilters): boolean {
  return (
    filters.fuel != null ||
    filters.driveType != null ||
    filters.powerMin != null ||
    filters.powerMax != null
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/vehicle-selector/type-filters.test.ts`
Expected: `pass 8`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/components/vehicle-selector/type-filters.ts src/components/vehicle-selector/type-filters.test.ts
git commit -m "feat: add type-table facet filter pure functions (fuel, drive type, power range)"
```

---

### Task 3: `product-use-filter.ts` pure functions

**Files:**
- Create: `src/components/vehicle-selector/product-use-filter.ts`
- Test: `src/components/vehicle-selector/product-use-filter.test.ts`

**Interfaces:**
- Consumes: `RecommendationComponent`, `ProductRecommendation` from `@/lib/olyslager/types`.
- Produces: `extractUseNames(components: RecommendationComponent[]): string[]`, `filterComponentsByUseName(components: RecommendationComponent[], useName: string | null): RecommendationComponent[]` — both used by Task 8 (`ResultsPanel`).

- [ ] **Step 1: Write the failing test**

```ts
// src/components/vehicle-selector/product-use-filter.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractUseNames, filterComponentsByUseName } from "./product-use-filter.ts";
import type { ProductRecommendation, RecommendationComponent } from "@/lib/olyslager/types";

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

function makeComponent(overrides: Partial<RecommendationComponent> = {}): RecommendationComponent {
  return {
    id: 1,
    appOrder: 1,
    componentName: "Engine",
    componentCode: null,
    componentCategoryId: null,
    productRecommendations: [],
    capacities: [],
    ...overrides,
  };
}

test("filterComponentsByUseName: null useName returns the same components unfiltered", () => {
  const components = [
    makeComponent({ productRecommendations: [makeProduct({ useName: "Normal" })] }),
  ];
  assert.deepEqual(filterComponentsByUseName(components, null), components);
});

test("filterComponentsByUseName: keeps only products matching the given useName", () => {
  const components = [
    makeComponent({
      productRecommendations: [
        makeProduct({ productName: "A", useName: "Normal" }),
        makeProduct({ productName: "B", useName: "Severe" }),
      ],
    }),
  ];
  const filtered = filterComponentsByUseName(components, "Severe");
  assert.equal(filtered[0].productRecommendations.length, 1);
  assert.equal(filtered[0].productRecommendations[0].productName, "B");
});

test("filterComponentsByUseName: keeps capacities untouched regardless of the filter", () => {
  const components = [
    makeComponent({
      productRecommendations: [makeProduct({ useName: "Normal" })],
      capacities: [{ appOrder: 1, item: "Capacity", value: 5, unit: "liter", condition: null }],
    }),
  ];
  const filtered = filterComponentsByUseName(components, "Severe");
  assert.equal(filtered[0].productRecommendations.length, 0);
  assert.equal(filtered[0].capacities.length, 1);
});

test("extractUseNames: dedupes and sorts across components, skips null", () => {
  const components = [
    makeComponent({ productRecommendations: [makeProduct({ useName: "Severe" })] }),
    makeComponent({
      productRecommendations: [
        makeProduct({ useName: "Normal" }),
        makeProduct({ useName: "Severe" }),
        makeProduct({ useName: null }),
      ],
    }),
  ];
  assert.deepEqual(extractUseNames(components), ["Normal", "Severe"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/vehicle-selector/product-use-filter.test.ts`
Expected: FAIL — `Cannot find module './product-use-filter.ts'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/components/vehicle-selector/product-use-filter.ts
import type { RecommendationComponent } from "@/lib/olyslager/types";

export function extractUseNames(components: RecommendationComponent[]): string[] {
  const values = new Set<string>();
  for (const component of components) {
    for (const product of component.productRecommendations) {
      if (product.useName) values.add(product.useName);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function filterComponentsByUseName(
  components: RecommendationComponent[],
  useName: string | null,
): RecommendationComponent[] {
  if (!useName) return components;
  return components.map((component) => ({
    ...component,
    productRecommendations: component.productRecommendations.filter(
      (product) => product.useName === useName,
    ),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/vehicle-selector/product-use-filter.test.ts`
Expected: `pass 4`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/components/vehicle-selector/product-use-filter.ts src/components/vehicle-selector/product-use-filter.test.ts
git commit -m "feat: add results-page product use filter pure functions"
```

---

### Task 4: `FilterableStepLayout` presentational component

**Files:**
- Create: `src/components/vehicle-selector/filterable-step-layout.tsx`

**Interfaces:**
- Produces: `FilterableStepLayout({ content, filters }: { content: ReactNode; filters?: ReactNode })` — used by Tasks 6, 7, 8.

No test file for this task — see the Global Constraints note on why (`node --test` cannot run `.tsx`, and this codebase has no JSX test renderer installed).

- [ ] **Step 1: Write the component**

```tsx
// src/components/vehicle-selector/filterable-step-layout.tsx
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

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/vehicle-selector/filterable-step-layout.tsx
git commit -m "feat: add FilterableStepLayout two-column presentational wrapper"
```

---

### Task 5: i18n keys for filters (bg + en)

**Files:**
- Modify: `src/messages/bg.json`
- Modify: `src/messages/en.json`

**Interfaces:**
- Produces: translation keys consumed by Tasks 6, 7, 8 — `Common.allOption`; `VehiclePicker.filterByName`, `VehiclePicker.clearFilter`, `VehiclePicker.clearFilters`, `VehiclePicker.fuelFilterLabel`, `VehiclePicker.driveTypeFilterLabel`, `VehiclePicker.powerFromLabel`, `VehiclePicker.powerToLabel`, `VehiclePicker.noMatches`; `Results.useFilterLabel`.

- [ ] **Step 1: Add the keys to `src/messages/bg.json`**

In the `"VehiclePicker"` block, add after `"cylindersColumn": "Цилиндри"`:

```json
    "cylindersColumn": "Цилиндри",
    "filterByName": "Търсене по име",
    "clearFilter": "Изчисти филтър",
    "clearFilters": "Изчисти филтри",
    "fuelFilterLabel": "Гориво",
    "driveTypeFilterLabel": "Задвижване",
    "powerFromLabel": "Мощност от",
    "powerToLabel": "Мощност до",
    "noMatches": "Няма съвпадения с текущия филтър"
```

In the `"Results"` block, add after `"dataLanguageNote": "..."`:

```json
    "dataLanguageNote": "Данните за автомобила и продуктите са налични само на английски език.",
    "useFilterLabel": "Приложение"
```

In the `"Common"` block, add after `"removeLabel": "Премахни {label}"`:

```json
    "removeLabel": "Премахни {label}",
    "allOption": "Всички"
```

- [ ] **Step 2: Add the matching keys to `src/messages/en.json`**

In the `"VehiclePicker"` block, add after `"cylindersColumn": "Cylinders"`:

```json
    "cylindersColumn": "Cylinders",
    "filterByName": "Search by name",
    "clearFilter": "Clear filter",
    "clearFilters": "Clear filters",
    "fuelFilterLabel": "Fuel",
    "driveTypeFilterLabel": "Drive type",
    "powerFromLabel": "Power from",
    "powerToLabel": "Power to",
    "noMatches": "No matches for the current filter"
```

In the `"Results"` block, add after `"dataLanguageNote": "..."`:

```json
    "dataLanguageNote": "Vehicle and product data is provided in English.",
    "useFilterLabel": "Use"
```

In the `"Common"` block, add after `"removeLabel": "Remove {label}"`:

```json
    "removeLabel": "Remove {label}",
    "allOption": "All"
```

- [ ] **Step 3: Verify both JSON files still parse and stay parallel**

Run: `node -e "const bg=require('./src/messages/bg.json'); const en=require('./src/messages/en.json'); const keys=o=>JSON.stringify(Object.keys(o).sort()); for (const ns of Object.keys(bg)) { if (keys(bg[ns]) !== keys(en[ns])) throw new Error('key mismatch in ' + ns); } console.log('OK, namespaces:', Object.keys(bg));"`
Expected: `OK, namespaces: [ 'Nav', 'Landing', 'VehiclePicker', 'Search', 'Results', 'Common' ]` and no thrown error.

- [ ] **Step 4: Commit**

```bash
git add src/messages/bg.json src/messages/en.json
git commit -m "feat: add i18n keys for vehicle-selector filters"
```

---

### Task 6: Wire the name filter into `MakeGrid` and `ModelGrid`

**Files:**
- Modify: `src/components/vehicle-selector/make-grid.tsx` (full file replacement below)
- Modify: `src/components/vehicle-selector/model-grid.tsx` (full file replacement below)

**Interfaces:**
- Consumes: `matchesNameFilter` (Task 1), `FilterableStepLayout` (Task 4), i18n keys `filterByName`/`clearFilter`/`noMatches` (Task 5).
- No new props on `MakeGrid`/`ModelGrid` — `categoryId`/`onSelect` and `makeId`/`onSelect` signatures are unchanged, so `vehicle-selector.tsx` needs no changes.

- [ ] **Step 1: Replace `src/components/vehicle-selector/make-grid.tsx`**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { matchesNameFilter } from "./name-filter";
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
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyMakes")}</p>;
  }

  const filtered = data.filter((make) => matchesNameFilter(make.makeName, query));

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
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
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

- [ ] **Step 2: Replace `src/components/vehicle-selector/model-grid.tsx`**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { matchesNameFilter } from "./name-filter";
import { FilterableStepLayout } from "./filterable-step-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Model } from "@/lib/olyslager/types";

interface ModelGridProps {
  makeId: number;
  onSelect: (model: Model) => void;
}

export function ModelGrid({ makeId, onSelect }: ModelGridProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerList<Model>(
    `/api/olyslager/models?makeId=${makeId}`,
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyModels")}</p>;
  }

  const filtered = data.filter((model) => matchesNameFilter(model.modelName, query));

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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {filtered.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelect(model)}
                className="flex flex-col items-center gap-2 rounded-[3px] border border-border bg-card px-3 py-4 text-center transition-colors hover:border-primary"
              >
                {model.imageUrlMedium ? (
                  <Image
                    src={model.imageUrlMedium}
                    alt=""
                    width={120}
                    height={60}
                    className="h-[60px] w-[120px] object-contain"
                  />
                ) : (
                  <div className="h-[60px] w-[120px]" />
                )}
                <span className="text-sm font-medium">
                  {model.modelName}
                  {model.code ? ` (${model.code})` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {model.yearStart}
                  {model.yearEnd ? `–${model.yearEnd}` : "+"}
                </span>
              </button>
            ))}
          </div>
        )
      }
      filters={
        <div className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-3">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="model-name-filter">
            {t("filterByName")}
          </label>
          <Input
            id="model-name-filter"
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

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/vehicle-selector/make-grid.tsx src/components/vehicle-selector/model-grid.tsx`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run the dev server (`npm run dev`), open `/bg`, select "Cars", and confirm: a filter panel with a "Търсене по име" input appears to the right of the make grid; typing "aud" narrows the grid to Audi variants; clearing the input restores the full grid; typing a nonsense query shows the "no matches" message with a working "Изчисти филтър" button. Repeat for the model grid after picking a make.

- [ ] **Step 5: Commit**

```bash
git add src/components/vehicle-selector/make-grid.tsx src/components/vehicle-selector/model-grid.tsx
git commit -m "feat: add name-search filter panel to make and model grids"
```

---

### Task 7: Wire fuel/drive-type/power filters into `TypeTable`

**Files:**
- Modify: `src/components/vehicle-selector/type-table.tsx` (full file replacement below)

**Interfaces:**
- Consumes: `EMPTY_TYPE_FILTERS`, `extractDistinctValues`, `matchesTypeFilters`, `hasActiveTypeFilters`, `TypeFilters` (Task 2), `FilterableStepLayout` (Task 4), i18n keys `fuelFilterLabel`/`driveTypeFilterLabel`/`powerFromLabel`/`powerToLabel`/`clearFilters`/`noMatches`/`allOption` (Task 5).
- `TypeTableProps` (`modelId`, `onSelect`) is unchanged.

- [ ] **Step 1: Replace `src/components/vehicle-selector/type-table.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterableStepLayout } from "./filterable-step-layout";
import {
  EMPTY_TYPE_FILTERS,
  extractDistinctValues,
  hasActiveTypeFilters,
  matchesTypeFilters,
  type TypeFilters,
} from "./type-filters";
import type { VehicleType } from "@/lib/olyslager/types";

interface TypeTableProps {
  modelId: number;
  onSelect: (type: VehicleType) => void;
}

type SortKey = "typeName" | "yearStart" | "powerHP" | "cylinderCC";

export function TypeTable({ modelId, onSelect }: TypeTableProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerList<VehicleType>(
    `/api/olyslager/types?modelId=${modelId}`,
  );
  const [sortKey, setSortKey] = useState<SortKey>("typeName");
  const [sortAsc, setSortAsc] = useState(true);
  const [fuel, setFuel] = useState<string | null>(null);
  const [driveType, setDriveType] = useState<string | null>(null);
  const [powerMinInput, setPowerMinInput] = useState("");
  const [powerMaxInput, setPowerMaxInput] = useState("");

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
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyTypes")}</p>;
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((asc) => !asc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function clearFilters() {
    setFuel(null);
    setDriveType(null);
    setPowerMinInput("");
    setPowerMaxInput("");
  }

  const filters: TypeFilters = {
    ...EMPTY_TYPE_FILTERS,
    fuel,
    driveType,
    powerMin: powerMinInput.trim() === "" ? null : Number(powerMinInput),
    powerMax: powerMaxInput.trim() === "" ? null : Number(powerMaxInput),
  };
  const fuelOptions = extractDistinctValues(data, "fuel");
  const driveTypeOptions = extractDistinctValues(data, "driveType");
  const filteredTypes = data.filter((type) => matchesTypeFilters(type, filters));
  const filtersActive = hasActiveTypeFilters(filters);

  const sorted = [...filteredTypes].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv)) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });

  return (
    <FilterableStepLayout
      content={
        sorted.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{t("noMatches")}</p>
            <Button size="sm" variant="outline" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  aria-sort={
                    sortKey === "typeName" ? (sortAsc ? "ascending" : "descending") : undefined
                  }
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort("typeName")}
                  >
                    {t("typeLabel")}
                    {sortKey === "typeName" &&
                      (sortAsc ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      ))}
                  </button>
                </TableHead>
                <TableHead>{t("fuelColumn")}</TableHead>
                <TableHead
                  aria-sort={
                    sortKey === "yearStart" ? (sortAsc ? "ascending" : "descending") : undefined
                  }
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort("yearStart")}
                  >
                    {t("yearsColumn")}
                    {sortKey === "yearStart" &&
                      (sortAsc ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      ))}
                  </button>
                </TableHead>
                <TableHead
                  aria-sort={
                    sortKey === "powerHP" ? (sortAsc ? "ascending" : "descending") : undefined
                  }
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort("powerHP")}
                  >
                    {t("powerColumn")}
                    {sortKey === "powerHP" &&
                      (sortAsc ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      ))}
                  </button>
                </TableHead>
                <TableHead
                  aria-sort={
                    sortKey === "cylinderCC" ? (sortAsc ? "ascending" : "descending") : undefined
                  }
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort("cylinderCC")}
                  >
                    {t("capacityColumn")}
                    {sortKey === "cylinderCC" &&
                      (sortAsc ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      ))}
                  </button>
                </TableHead>
                <TableHead>{t("cylindersColumn")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.typeName}</TableCell>
                  <TableCell>{type.fuel ?? "—"}</TableCell>
                  <TableCell>
                    {type.yearStart}
                    {type.yearEnd ? `–${type.yearEnd}` : "+"}
                  </TableCell>
                  <TableCell>
                    {type.powerHP ? `${type.powerHP} HP / ${type.powerKW} kW` : "—"}
                  </TableCell>
                  <TableCell>{type.cylinderCC ? `${type.cylinderCC} ccm` : "—"}</TableCell>
                  <TableCell>{type.cylinderCount ?? "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => onSelect(type)}>
                      {t("viewRecommendations")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      }
      filters={
        <div className="flex flex-col gap-3 rounded-[3px] border border-border bg-card p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="type-fuel-filter">
              {t("fuelFilterLabel")}
            </label>
            <select
              id="type-fuel-filter"
              value={fuel ?? ""}
              onChange={(e) => setFuel(e.target.value === "" ? null : e.target.value)}
              className="h-8 w-full rounded-[3px] border border-input bg-transparent px-2 text-sm"
            >
              <option value="">{tc("allOption")}</option>
              {fuelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="type-drivetype-filter"
            >
              {t("driveTypeFilterLabel")}
            </label>
            <select
              id="type-drivetype-filter"
              value={driveType ?? ""}
              onChange={(e) => setDriveType(e.target.value === "" ? null : e.target.value)}
              className="h-8 w-full rounded-[3px] border border-input bg-transparent px-2 text-sm"
            >
              <option value="">{tc("allOption")}</option>
              {driveTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("powerColumn")}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={powerMinInput}
                onChange={(e) => setPowerMinInput(e.target.value)}
                placeholder={t("powerFromLabel")}
                aria-label={t("powerFromLabel")}
              />
              <Input
                type="number"
                inputMode="numeric"
                value={powerMaxInput}
                onChange={(e) => setPowerMaxInput(e.target.value)}
                placeholder={t("powerToLabel")}
                aria-label={t("powerToLabel")}
              />
            </div>
          </div>
          {filtersActive && (
            <Button size="sm" variant="outline" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          )}
        </div>
      }
    />
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/vehicle-selector/type-table.tsx`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Drill down to a model with several engine types. Confirm: the fuel and drive-type `<select>` options match the distinct values actually present in the table; picking a fuel narrows the rows; setting a power "From" value excludes lower-power rows; combining fuel + power narrows further (AND); "Изчисти филтри" only appears once a filter is active and clears all four controls; sortable-column clicking still works on the filtered set; filtering everything out shows the "no matches" message with a working clear button.

- [ ] **Step 4: Commit**

```bash
git add src/components/vehicle-selector/type-table.tsx
git commit -m "feat: add fuel/drive-type/power filter panel to TypeTable"
```

---

### Task 8: Wire the use-name filter into `ResultsPanel`

**Files:**
- Modify: `src/components/vehicle-selector/results-panel.tsx` (full file replacement below)

**Interfaces:**
- Consumes: `extractUseNames`, `filterComponentsByUseName` (Task 3), `FilterableStepLayout` (Task 4), i18n key `Results.useFilterLabel` and `Common.allOption` (Task 5).
- `ResultsPanelProps` (`typeId`, `onLoaded`) is unchanged. `component-card.tsx` is **not** modified — it already renders whatever `productRecommendations` it's given.

- [ ] **Step 1: Replace `src/components/vehicle-selector/results-panel.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useOlyslagerResource } from "@/hooks/use-olyslager-resource";
import { VehicleHeaderCard } from "@/components/results/vehicle-header-card";
import { ComponentCard } from "@/components/results/component-card";
import { FilterableStepLayout } from "./filterable-step-layout";
import { extractUseNames, filterComponentsByUseName } from "./product-use-filter";
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
  const [useName, setUseName] = useState<string | null>(null);

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
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (data.components.length === 0) {
    return (
      <div>
        <VehicleHeaderCard vehicle={data} />
        <Alert>
          <AlertDescription>{t("noComponents")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const useNameOptions = extractUseNames(data.components);
  const filteredComponents = filterComponentsByUseName(data.components, useName);

  return (
    <FilterableStepLayout
      content={
        <div>
          <VehicleHeaderCard vehicle={data} />
          {filteredComponents.map((component) => (
            <ComponentCard key={component.id} component={component} />
          ))}
        </div>
      }
      filters={
        useNameOptions.length > 1 ? (
          <div className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-3">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="results-use-filter"
            >
              {t("useFilterLabel")}
            </label>
            <select
              id="results-use-filter"
              value={useName ?? ""}
              onChange={(e) => setUseName(e.target.value === "" ? null : e.target.value)}
              className="h-8 w-full rounded-[3px] border border-input bg-transparent px-2 text-sm"
            >
              <option value="">{tc("allOption")}</option>
              {useNameOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ) : undefined
      }
    />
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/components/vehicle-selector/results-panel.tsx`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Open a results page for a vehicle whose recommendations include more than one distinct `useName` (e.g. a component with both "Normal" and an extended/severe use, such as the Engine component seen on Audi A6 typeId 71354 during earlier testing this session). Confirm: the panel appears with a "Приложение" select listing the distinct values; picking one hides non-matching product rows but keeps the component card and its capacities visible; picking "Всички" restores all rows. For a vehicle whose recommendations only have one distinct `useName` (or the fallback default "Normal" everywhere), confirm the panel does **not** appear.

- [ ] **Step 4: Commit**

```bash
git add src/components/vehicle-selector/results-panel.tsx
git commit -m "feat: add product-use filter panel to ResultsPanel"
```

---

### Task 9: Widen the page container and run full verification

**Files:**
- Modify: `src/app/[locale]/page.tsx:21`

**Interfaces:**
- None — this is a layout-only change plus final verification of the whole feature.

- [ ] **Step 1: Widen the container**

In `src/app/[locale]/page.tsx`, change:

```tsx
      <div className="mt-10 w-full max-w-5xl">
```

to:

```tsx
      <div className="mt-10 w-full max-w-[1320px]">
```

- [ ] **Step 2: Type-check, lint, and run every test file**

Run:
```bash
npx tsc --noEmit
npx eslint .
node --test src/components/vehicle-selector/*.test.ts
```
Expected: no `tsc`/`eslint` errors; all `node --test` files pass (name-filter, type-filters, product-use-filter, derive-step — `pass` count matching the sum of each file's test count, `fail 0`).

- [ ] **Step 3: Full manual walkthrough**

With `npm run dev` running, in the browser at `/bg`:
1. Category step: confirm there is **no** filter panel (6 cards, full width, unchanged from before this feature).
2. Make step: confirm the panel appears, filter narrows the grid, container is visibly wider than before (panel doesn't force the grid to shrink or wrap awkwardly).
3. Model step: same check.
4. Type step: confirm all three facet filters work together and combine with the existing column sorting.
5. Pick a type, confirm results render with the use-name filter panel (when applicable) and capacities stay visible under filtering.
6. Refresh the browser at each step (category/make/model/type/results, via the existing URL query params) and confirm the filter panel re-appears correctly for that step with **no filters pre-applied** (filters are local state only, per the Global Constraints — this is expected and correct, not a bug).
7. Confirm the search-box shortcut (typing a query, picking a result) still jumps straight to the results panel and the use-name filter works there too.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/page.tsx
git commit -m "feat: widen page container to fit the filter panel"
```
