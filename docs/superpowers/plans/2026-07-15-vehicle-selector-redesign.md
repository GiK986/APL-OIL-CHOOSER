# Vehicle Selector Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four-dropdown vehicle picker with a breadcrumb-chip + card-grid/table flow (category → make → model → type), and restyle the whole app to match the host site's design tokens (colors, radius, font) it will be embedded into as an iframe.

**Architecture:** A single `VehicleSelector` client component owns `{category, make, model}` state and a derived `step`. Each step renders one presentational grid/table component; making a selection collapses the previous step into a removable `BreadcrumbChip` and reveals the next step. Design tokens move from shadcn defaults into `globals.css` CSS variables so every existing shadcn primitive (Button, Card, Table, Badge) picks up the new palette/radius/font without per-component overrides.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4 (`@theme` tokens), shadcn/ui (Base UI primitives), next-intl, lucide-react icons, Node's built-in `node --test` for the one unit of pure logic in this feature.

## Global Constraints

- Design tokens (from `docs/superpowers/specs/2026-07-15-vehicle-selector-redesign-design.md`): `--primary: #BE0F0C`, `--background: #EAE9E9`, `--card: #FFFFFF`, `--border`/`--input: #E0E0E0`, `--foreground`/`--card-foreground: #212121`, `--radius: 3px`, font `"Open Sans", Arial, Helvetica, sans-serif`. Set once in `globals.css` + `layout.tsx`, never hardcoded per-component.
- Desktop-only, wide iframe — no mobile-first redesign needed; keep existing `sm:`/`lg:` breakpoints only as graceful degradation, not as the design target.
- Category defaults to `Cars` (id `1`) on mount; the picker opens directly on the Make grid.
- The old `src/components/vehicle-picker/` directory and its four `<Select>` dropdowns are fully replaced — no dropdown fallback.
- `src/lib/olyslager/*`, all six `/api/olyslager/*` route handlers, and `src/hooks/use-olyslager-list.ts` are unchanged and must be reused as-is (`useOlyslagerList<T>(url: string | null): { data: T[] | null; loading: boolean; error: boolean; retry: () => void }`).
- Confirmed lucide-react icon exports for the 6 Olyslager categories (ids verified live: 1=Cars, 2=LCV, 3=Trucks/Buses, 4=Motorcycles, 5=Agricultural, 10=Construction): `CarFront`, `Van`, `Motorbike`, `Truck`, `Tractor`, `Construction`.

---

### Task 1: Design tokens — colors, radius, font

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/[locale]/layout.tsx`

**Interfaces:**
- Produces: CSS variables `--primary`, `--primary-foreground`, `--background`, `--foreground`, `--card`, `--card-foreground`, `--border`, `--input`, `--ring`, `--radius`, `--font-sans` consumed by every shadcn component in later tasks and by the existing results page (no code changes there — it inherits automatically).

- [ ] **Step 1: Replace the Geist font with Open Sans in the locale layout**

In `src/app/[locale]/layout.tsx`, replace:

```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

with:

```tsx
import { Open_Sans } from "next/font/google";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});
```

and replace the `className` on the `<html>` element:

```tsx
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
```

with:

```tsx
      className={`${openSans.variable} h-full antialiased`}
```

- [ ] **Step 2: Point the theme's font tokens at Open Sans**

In `src/app/globals.css`, inside the `@theme inline { ... }` block, replace:

```css
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
```

with:

```css
  --font-sans: var(--font-open-sans);
  --font-mono: ui-monospace, monospace;
```

(This also fixes a pre-existing self-reference bug — `--font-sans: var(--font-sans)` pointed at itself.)

- [ ] **Step 3: Replace the light-theme color/radius tokens**

In `src/app/globals.css`, inside the `:root { ... }` block, replace these seven lines:

```css
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
```

```css
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
```

```css
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
```

```css
  --radius: 0.625rem;
```

with:

```css
  --background: #eae9e9;
  --foreground: #212121;
  --card: #ffffff;
  --card-foreground: #212121;
```

```css
  --primary: #be0f0c;
  --primary-foreground: #ffffff;
```

```css
  --border: #e0e0e0;
  --input: #e0e0e0;
  --ring: #be0f0c;
```

```css
  --radius: 3px;
```

Leave `--secondary`, `--muted`, `--accent`, `--destructive`, `--chart-*`, `--sidebar-*`, and the entire `.dark { ... }` block untouched — out of scope (no dark-mode toggle exists in the app).

- [ ] **Step 4: Verify with a type check and a visual check**

Run: `npx tsc --noEmit`
Expected: no output (clean).

Run: `npm run dev` (if not already running), then in a Playwright script or browser:
```
open http://localhost:3000/bg
```
Expected: page background is light gray, the landing headline/body use Open Sans, and any existing buttons (there are none on the bare landing page yet before Task 9 lands) would render with the red primary color and 3px corners once present. Since `VehiclePicker` is still mounted at this point (Task 9 hasn't swapped it in yet), visually confirm the picker's existing `<Select>` triggers now have square-ish (3px) corners and the "Виж препоръки" button is red instead of the old black — this is expected and correct (old component picks up new tokens automatically).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/[locale]/layout.tsx
git commit -m "style: apply Auto Plus design tokens (colors, 3px radius, Open Sans)"
```

---

### Task 2: Category icon map

**Files:**
- Create: `src/lib/olyslager/category-icons.ts`

**Interfaces:**
- Produces: `CATEGORY_ICONS: Record<number, LucideIcon>`, `DEFAULT_CATEGORY_ICON: LucideIcon` — consumed by Task 5 (`category-grid.tsx`) and Task 9 (`vehicle-selector.tsx`, for the category breadcrumb chip icon).

- [ ] **Step 1: Create the icon map**

```ts
import { CarFront, Van, Motorbike, Truck, Tractor, Construction, type LucideIcon } from "lucide-react";

export const CATEGORY_ICONS: Record<number, LucideIcon> = {
  1: CarFront,
  2: Van,
  3: Truck,
  4: Motorbike,
  5: Tractor,
  10: Construction,
};

export const DEFAULT_CATEGORY_ICON: LucideIcon = CarFront;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output (clean). This confirms all six lucide-react exports resolve (already verified live against `node_modules/lucide-react/dist/esm/icons/index.mjs`, which lists `CarFront`, `Construction`, `Motorbike`, `Tractor`, `Truck`, `Van` as real exports).

- [ ] **Step 3: Commit**

```bash
git add src/lib/olyslager/category-icons.ts
git commit -m "feat: map Olyslager category ids to lucide icons"
```

---

### Task 3: Step-derivation pure function (with real unit test)

**Files:**
- Create: `src/components/vehicle-selector/derive-step.ts`
- Test: `src/components/vehicle-selector/derive-step.test.ts`

**Interfaces:**
- Produces: `type SelectorStep = "category" | "make" | "model" | "type"`, `deriveStep(input: DeriveStepInput): SelectorStep` — consumed by Task 9 (`vehicle-selector.tsx`).

- [ ] **Step 1: Write the failing test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveStep } from "./derive-step";

test("shows category grid when nothing selected", () => {
  assert.equal(
    deriveStep({ hasCategory: false, hasMake: false, hasModel: false, showCategoryGrid: false }),
    "category",
  );
});

test("shows make grid once a category is selected", () => {
  assert.equal(
    deriveStep({ hasCategory: true, hasMake: false, hasModel: false, showCategoryGrid: false }),
    "make",
  );
});

test("shows model grid once make is selected", () => {
  assert.equal(
    deriveStep({ hasCategory: true, hasMake: true, hasModel: false, showCategoryGrid: false }),
    "model",
  );
});

test("shows type table once model is selected", () => {
  assert.equal(
    deriveStep({ hasCategory: true, hasMake: true, hasModel: true, showCategoryGrid: false }),
    "type",
  );
});

test("showCategoryGrid forces the category step even if a category is already selected", () => {
  assert.equal(
    deriveStep({ hasCategory: true, hasMake: true, hasModel: true, showCategoryGrid: true }),
    "category",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/components/vehicle-selector/derive-step.test.ts`
Expected: FAIL — `Cannot find module './derive-step'` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
export type SelectorStep = "category" | "make" | "model" | "type";

export interface DeriveStepInput {
  hasCategory: boolean;
  hasMake: boolean;
  hasModel: boolean;
  showCategoryGrid: boolean;
}

export function deriveStep({
  hasCategory,
  hasMake,
  hasModel,
  showCategoryGrid,
}: DeriveStepInput): SelectorStep {
  if (showCategoryGrid || !hasCategory) return "category";
  if (!hasMake) return "make";
  if (!hasModel) return "model";
  return "type";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/components/vehicle-selector/derive-step.test.ts`
Expected: `pass 5`, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/components/vehicle-selector/derive-step.ts src/components/vehicle-selector/derive-step.test.ts
git commit -m "feat: add pure step-derivation function for vehicle selector"
```

---

### Task 4: BreadcrumbChip component

**Files:**
- Create: `src/components/vehicle-selector/breadcrumb-chip.tsx`

**Interfaces:**
- Consumes: nothing new (plain props).
- Produces: `BreadcrumbChip({ label, onClear, icon?, imageUrl? }: BreadcrumbChipProps)` — consumed by Task 9.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import Image from "next/image";
import { X, type LucideIcon } from "lucide-react";

interface BreadcrumbChipProps {
  label: string;
  onClear: () => void;
  icon?: LucideIcon;
  imageUrl?: string | null;
}

export function BreadcrumbChip({ label, onClear, icon: Icon, imageUrl }: BreadcrumbChipProps) {
  return (
    <div className="flex items-center gap-2 rounded-[3px] border border-border bg-card px-3 py-1.5 text-sm">
      {imageUrl ? (
        <Image src={imageUrl} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
      ) : Icon ? (
        <Icon className="size-4 text-primary" />
      ) : null}
      <span className="font-medium">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label}`}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/vehicle-selector/breadcrumb-chip.tsx
git commit -m "feat: add BreadcrumbChip component"
```

---

### Task 5: CategoryGrid component

**Files:**
- Create: `src/components/vehicle-selector/category-grid.tsx`

**Interfaces:**
- Consumes: `Category` type from `@/lib/olyslager/types` (`{id: number, categoryName: string, ...}`), `CATEGORY_ICONS`/`DEFAULT_CATEGORY_ICON` from Task 2.
- Produces: `CategoryGrid({ categories, onSelect }: CategoryGridProps)` — a presentational component (no data fetching; the parent in Task 9 fetches categories once and passes them down, since Task 9 also needs the fetched list to auto-select the default category). Consumed by Task 9.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "@/lib/olyslager/category-icons";
import type { Category } from "@/lib/olyslager/types";

interface CategoryGridProps {
  categories: Category[];
  onSelect: (category: Category) => void;
}

export function CategoryGrid({ categories, onSelect }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
      {categories.map((category) => {
        const Icon = CATEGORY_ICONS[category.id] ?? DEFAULT_CATEGORY_ICON;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category)}
            className="flex flex-col items-center gap-2 rounded-[3px] border border-border bg-card px-3 py-4 text-center transition-colors hover:border-primary"
          >
            <Icon className="size-8 text-primary" />
            <span className="text-xs font-medium">{category.categoryName}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/vehicle-selector/category-grid.tsx
git commit -m "feat: add CategoryGrid presentational component"
```

---

### Task 6: MakeGrid component

**Files:**
- Create: `src/components/vehicle-selector/make-grid.tsx`

**Interfaces:**
- Consumes: `useOlyslagerList<Make>(url)` from `@/hooks/use-olyslager-list`, `Make` type from `@/lib/olyslager/types`, `Common`/`VehiclePicker` translation namespaces (existing keys `error`/`retry`/`emptyMakes`).
- Produces: `MakeGrid({ categoryId, onSelect }: MakeGridProps)` — consumed by Task 9.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

  if (loading || !data) {
    return (
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

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

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyMakes")}</p>;
  }

  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
      {data.map((make) => (
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
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/vehicle-selector/make-grid.tsx
git commit -m "feat: add MakeGrid component with logo cards"
```

---

### Task 7: ModelGrid component

**Files:**
- Create: `src/components/vehicle-selector/model-grid.tsx`

**Interfaces:**
- Consumes: `useOlyslagerList<Model>(url)`, `Model` type, `Common`/`VehiclePicker` translations (existing keys `error`/`retry`/`emptyModels`).
- Produces: `ModelGrid({ makeId, onSelect }: ModelGridProps)` — consumed by Task 9.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

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

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyModels")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {data.map((model) => (
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
          <span className="text-sm font-medium">{model.modelName}</span>
          <span className="text-xs text-muted-foreground">
            {model.yearStart}
            {model.yearEnd ? `–${model.yearEnd}` : "+"}
          </span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/vehicle-selector/model-grid.tsx
git commit -m "feat: add ModelGrid component with vehicle image cards"
```

---

### Task 8: TypeTable component + new column-header translations

**Files:**
- Create: `src/components/vehicle-selector/type-table.tsx`
- Modify: `src/messages/bg.json`
- Modify: `src/messages/en.json`

**Interfaces:**
- Consumes: `useOlyslagerList<VehicleType>(url)`, `VehicleType` type (`{id, typeName, fuel, yearStart, yearEnd, powerHP, powerKW, cylinderCC, cylinderCount, ...}`), `useRouter` from `@/i18n/navigation`, existing `VehiclePicker.typeLabel`/`viewRecommendations`/`emptyTypes` translation keys plus five new ones added in this task.
- Produces: `TypeTable({ modelId }: TypeTableProps)` — consumed by Task 9. Navigates to `/results/{typeId}` on row action click (reuses the existing `results/[typeId]` route from the earlier phase — no changes needed there).

- [ ] **Step 1: Add the five new column-header keys**

Replace the entire contents of `src/messages/bg.json` with:

```json
{
  "Nav": {
    "title": "APL Избор на масло"
  },
  "Landing": {
    "headline": "Намерете правилното масло за вашия автомобил",
    "subcopy": "Изберете категория, марка, модел и двигател или потърсете директно по модел.",
    "orBrowseByCategory": "или разгледайте по категория"
  },
  "VehiclePicker": {
    "categoryLabel": "Категория",
    "categoryPlaceholder": "Изберете категория",
    "makeLabel": "Марка",
    "makePlaceholder": "Изберете марка",
    "modelLabel": "Модел",
    "modelPlaceholder": "Изберете модел",
    "typeLabel": "Двигател",
    "typePlaceholder": "Изберете двигател",
    "viewRecommendations": "Виж препоръки",
    "emptyMakes": "Няма намерени марки за тази категория",
    "emptyModels": "Няма намерени модели за тази марка",
    "emptyTypes": "Няма намерени варианти за този модел",
    "fuelColumn": "Гориво",
    "yearsColumn": "Години",
    "powerColumn": "Мощност",
    "capacityColumn": "Обем",
    "cylindersColumn": "Цилиндри"
  },
  "Search": {
    "placeholder": "Търсене по модел, напр. A6 2.0 130",
    "noResults": "Няма намерени резултати — опитайте друго търсене"
  },
  "Results": {
    "recommendedProducts": "Препоръчани продукти",
    "capacities": "Капацитети",
    "changeInterval": "Интервал на смяна",
    "productColumn": "Продукт",
    "codeColumn": "Код",
    "useColumn": "Приложение",
    "noComponents": "Няма налични препоръки за това превозно средство",
    "dataLanguageNote": "Данните за автомобила и продуктите са налични само на английски език.",
    "backToPicker": "Обратно към избора"
  },
  "Common": {
    "loading": "Зареждане...",
    "error": "Възникна грешка",
    "retry": "Опитай отново",
    "notFound": "Страницата не е намерена"
  }
}
```

Replace the entire contents of `src/messages/en.json` with:

```json
{
  "Nav": {
    "title": "APL Oil Chooser"
  },
  "Landing": {
    "headline": "Find the right oil for your vehicle",
    "subcopy": "Pick a category, make, model and engine type, or search directly by model.",
    "orBrowseByCategory": "or browse by category"
  },
  "VehiclePicker": {
    "categoryLabel": "Category",
    "categoryPlaceholder": "Select a category",
    "makeLabel": "Make",
    "makePlaceholder": "Select a make",
    "modelLabel": "Model",
    "modelPlaceholder": "Select a model",
    "typeLabel": "Engine type",
    "typePlaceholder": "Select an engine type",
    "viewRecommendations": "View recommendations",
    "emptyMakes": "No makes found for this category",
    "emptyModels": "No models found for this make",
    "emptyTypes": "No engine types found for this model",
    "fuelColumn": "Fuel",
    "yearsColumn": "Years",
    "powerColumn": "Power",
    "capacityColumn": "Capacity",
    "cylindersColumn": "Cylinders"
  },
  "Search": {
    "placeholder": "Search by model, e.g. A6 2.0 130",
    "noResults": "No matches — try a different search"
  },
  "Results": {
    "recommendedProducts": "Recommended products",
    "capacities": "Capacities",
    "changeInterval": "Change interval",
    "productColumn": "Product",
    "codeColumn": "Code",
    "useColumn": "Use",
    "noComponents": "No recommendations available for this vehicle",
    "dataLanguageNote": "Vehicle and product data is provided in English.",
    "backToPicker": "Back to picker"
  },
  "Common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Retry",
    "notFound": "Page not found"
  }
}
```

- [ ] **Step 2: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import type { VehicleType } from "@/lib/olyslager/types";

interface TypeTableProps {
  modelId: number;
}

type SortKey = "typeName" | "yearStart" | "powerHP" | "cylinderCC";

export function TypeTable({ modelId }: TypeTableProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const router = useRouter();
  const { data, loading, error, retry } = useOlyslagerList<VehicleType>(
    `/api/olyslager/types?modelId=${modelId}`,
  );
  const [sortKey, setSortKey] = useState<SortKey>("typeName");
  const [sortAsc, setSortAsc] = useState(true);

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

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

  const sorted = [...data].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv)) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="cursor-pointer" onClick={() => toggleSort("typeName")}>
            {t("typeLabel")}
          </TableHead>
          <TableHead>{t("fuelColumn")}</TableHead>
          <TableHead className="cursor-pointer" onClick={() => toggleSort("yearStart")}>
            {t("yearsColumn")}
          </TableHead>
          <TableHead className="cursor-pointer" onClick={() => toggleSort("powerHP")}>
            {t("powerColumn")}
          </TableHead>
          <TableHead className="cursor-pointer" onClick={() => toggleSort("cylinderCC")}>
            {t("capacityColumn")}
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
              <Button size="sm" onClick={() => router.push(`/results/${type.id}`)}>
                {t("viewRecommendations")}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/components/vehicle-selector/type-table.tsx src/messages/bg.json src/messages/en.json
git commit -m "feat: add sortable TypeTable component with column translations"
```

---

### Task 9: VehicleSelector container

**Files:**
- Create: `src/components/vehicle-selector/vehicle-selector.tsx`

**Interfaces:**
- Consumes: `deriveStep` (Task 3), `BreadcrumbChip` (Task 4), `CategoryGrid` (Task 5), `MakeGrid` (Task 6), `ModelGrid` (Task 7), `TypeTable` (Task 8), `CATEGORY_ICONS`/`DEFAULT_CATEGORY_ICON` (Task 2), `useOlyslagerList<Category>` (existing hook), `SearchBox` (existing component, repositioned in Task 10 — import it here regardless since Task 10 only changes its internal layout, not its export).
- Produces: `VehicleSelector()` — the component mounted by `page.tsx` in Task 11.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "@/lib/olyslager/category-icons";
import { deriveStep } from "./derive-step";
import { BreadcrumbChip } from "./breadcrumb-chip";
import { CategoryGrid } from "./category-grid";
import { MakeGrid } from "./make-grid";
import { ModelGrid } from "./model-grid";
import { TypeTable } from "./type-table";
import { SearchBox } from "@/components/search/search-box";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Category, Make, Model } from "@/lib/olyslager/types";

const DEFAULT_CATEGORY_ID = 1; // Cars

export function VehicleSelector() {
  const tc = useTranslations("Common");
  const { data: categories, loading, error, retry } = useOlyslagerList<Category>(
    "/api/olyslager/categories",
  );

  const [category, setCategory] = useState<Category | null>(null);
  const [make, setMake] = useState<Make | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);

  useEffect(() => {
    if (categories && !category && !showCategoryGrid) {
      const defaultCategory =
        categories.find((c) => c.id === DEFAULT_CATEGORY_ID) ?? categories[0];
      if (defaultCategory) setCategory(defaultCategory);
    }
  }, [categories, category, showCategoryGrid]);

  function selectCategory(next: Category) {
    setCategory(next);
    setMake(null);
    setModel(null);
    setShowCategoryGrid(false);
  }
  function clearFromCategory() {
    setShowCategoryGrid(true);
    setCategory(null);
    setMake(null);
    setModel(null);
  }
  function clearFromMake() {
    setMake(null);
    setModel(null);
  }
  function clearFromModel() {
    setModel(null);
  }

  const step = deriveStep({
    hasCategory: category !== null,
    hasMake: make !== null,
    hasModel: model !== null,
    showCategoryGrid,
  });

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {category && !showCategoryGrid && (
          <BreadcrumbChip
            label={category.categoryName}
            icon={CATEGORY_ICONS[category.id] ?? DEFAULT_CATEGORY_ICON}
            onClear={clearFromCategory}
          />
        )}
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
        <div className="ml-auto w-full max-w-xs">
          <SearchBox />
        </div>
      </div>

      {step === "category" &&
        (loading || !categories ? (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>{tc("error")}</span>
              <Button size="sm" variant="outline" onClick={retry}>
                {tc("retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <CategoryGrid categories={categories} onSelect={selectCategory} />
        ))}
      {step === "make" && category && <MakeGrid categoryId={category.id} onSelect={setMake} />}
      {step === "model" && make && <ModelGrid makeId={make.id} onSelect={setModel} />}
      {step === "type" && model && <TypeTable modelId={model.id} />}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/vehicle-selector/vehicle-selector.tsx
git commit -m "feat: add VehicleSelector container with breadcrumb + step flow"
```

---

### Task 10: Reposition SearchBox as an inline overlay dropdown

**Files:**
- Modify: `src/components/search/search-box.tsx`

**Interfaces:**
- Consumes: unchanged (`useDebouncedValue`, `SearchResultsList`, `/api/olyslager/search`).
- Produces: unchanged export `SearchBox()` — same component, only its internal layout changes from "full-width, results push content down" to "narrow, results float in an absolutely-positioned panel" so it fits in the `max-w-xs` slot inside `VehicleSelector`'s breadcrumb row (Task 9) without shoving the grid below it around while typing.

- [ ] **Step 1: Replace the return statement**

In `src/components/search/search-box.tsx`, replace:

```tsx
  return (
    <div className="w-full">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("placeholder")}
      />
      {debouncedQuery && loading && (
        <p className="mt-3 text-center text-sm text-muted-foreground">…</p>
      )}
      {debouncedQuery && !loading && (
        <SearchResultsList results={results} />
      )}
    </div>
  );
```

with:

```tsx
  return (
    <div className="relative w-full">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("placeholder")}
      />
      {debouncedQuery && loading && (
        <p className="absolute z-10 mt-1 w-full rounded-[3px] border border-border bg-card p-3 text-center text-sm text-muted-foreground shadow-md">
          …
        </p>
      )}
      {debouncedQuery && !loading && (
        <div className="absolute z-10 mt-1 max-h-96 w-full overflow-y-auto rounded-[3px] border border-border bg-card shadow-md">
          <SearchResultsList results={results} />
        </div>
      )}
    </div>
  );
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/search-box.tsx
git commit -m "style: float SearchBox results as an overlay panel for inline placement"
```

---

### Task 11: Wire the landing page to VehicleSelector, remove the old picker

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Delete: `src/components/vehicle-picker/vehicle-picker.tsx`
- Delete: `src/hooks/use-debounced-value.ts` if unused elsewhere (check first — see Step 3)
- Modify: `src/messages/bg.json`
- Modify: `src/messages/en.json`

**Interfaces:**
- Consumes: `VehicleSelector` from `@/components/vehicle-selector/vehicle-selector` (Task 9).
- Produces: nothing new — this is the final wiring task that makes the redesign live.

- [ ] **Step 1: Replace `page.tsx`**

Replace the entire contents of `src/app/[locale]/page.tsx` with:

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VehicleSelector } from "@/components/vehicle-selector/vehicle-selector";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{t("headline")}</h1>
        <p className="mt-3 text-muted-foreground">{t("subcopy")}</p>
      </div>
      <div className="mt-10 w-full max-w-5xl">
        <VehicleSelector />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Delete the old picker directory**

```bash
rm -rf src/components/vehicle-picker
```

- [ ] **Step 3: Check whether `use-debounced-value.ts` is still used, keep it if so**

Run: `grep -rl "use-debounced-value" src --include="*.tsx" --include="*.ts"`
Expected output: only `src/components/search/search-box.tsx` (still imports and uses it — do NOT delete this hook; it's a listed file above only as a check, not an actual deletion target). If the grep shows any other consumer, note it and keep the file regardless.

- [ ] **Step 4: Remove the now-unused `orBrowseByCategory` message key**

Replace the entire contents of `src/messages/bg.json` with:

```json
{
  "Nav": {
    "title": "APL Избор на масло"
  },
  "Landing": {
    "headline": "Намерете правилното масло за вашия автомобил",
    "subcopy": "Изберете категория, марка, модел и двигател или потърсете директно по модел."
  },
  "VehiclePicker": {
    "categoryLabel": "Категория",
    "categoryPlaceholder": "Изберете категория",
    "makeLabel": "Марка",
    "makePlaceholder": "Изберете марка",
    "modelLabel": "Модел",
    "modelPlaceholder": "Изберете модел",
    "typeLabel": "Двигател",
    "typePlaceholder": "Изберете двигател",
    "viewRecommendations": "Виж препоръки",
    "emptyMakes": "Няма намерени марки за тази категория",
    "emptyModels": "Няма намерени модели за тази марка",
    "emptyTypes": "Няма намерени варианти за този модел",
    "fuelColumn": "Гориво",
    "yearsColumn": "Години",
    "powerColumn": "Мощност",
    "capacityColumn": "Обем",
    "cylindersColumn": "Цилиндри"
  },
  "Search": {
    "placeholder": "Търсене по модел, напр. A6 2.0 130",
    "noResults": "Няма намерени резултати — опитайте друго търсене"
  },
  "Results": {
    "recommendedProducts": "Препоръчани продукти",
    "capacities": "Капацитети",
    "changeInterval": "Интервал на смяна",
    "productColumn": "Продукт",
    "codeColumn": "Код",
    "useColumn": "Приложение",
    "noComponents": "Няма налични препоръки за това превозно средство",
    "dataLanguageNote": "Данните за автомобила и продуктите са налични само на английски език.",
    "backToPicker": "Обратно към избора"
  },
  "Common": {
    "loading": "Зареждане...",
    "error": "Възникна грешка",
    "retry": "Опитай отново",
    "notFound": "Страницата не е намерена"
  }
}
```

Replace the entire contents of `src/messages/en.json` with:

```json
{
  "Nav": {
    "title": "APL Oil Chooser"
  },
  "Landing": {
    "headline": "Find the right oil for your vehicle",
    "subcopy": "Pick a category, make, model and engine type, or search directly by model."
  },
  "VehiclePicker": {
    "categoryLabel": "Category",
    "categoryPlaceholder": "Select a category",
    "makeLabel": "Make",
    "makePlaceholder": "Select a make",
    "modelLabel": "Model",
    "modelPlaceholder": "Select a model",
    "typeLabel": "Engine type",
    "typePlaceholder": "Select an engine type",
    "viewRecommendations": "View recommendations",
    "emptyMakes": "No makes found for this category",
    "emptyModels": "No models found for this make",
    "emptyTypes": "No engine types found for this model",
    "fuelColumn": "Fuel",
    "yearsColumn": "Years",
    "powerColumn": "Power",
    "capacityColumn": "Capacity",
    "cylindersColumn": "Cylinders"
  },
  "Search": {
    "placeholder": "Search by model, e.g. A6 2.0 130",
    "noResults": "No matches — try a different search"
  },
  "Results": {
    "recommendedProducts": "Recommended products",
    "capacities": "Capacities",
    "changeInterval": "Change interval",
    "productColumn": "Product",
    "codeColumn": "Code",
    "useColumn": "Use",
    "noComponents": "No recommendations available for this vehicle",
    "dataLanguageNote": "Vehicle and product data is provided in English.",
    "backToPicker": "Back to picker"
  },
  "Common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Retry",
    "notFound": "Page not found"
  }
}
```

- [ ] **Step 5: Verify with a type check**

Run: `npx tsc --noEmit`
Expected: no output. (This also confirms nothing still imports the deleted `vehicle-picker` directory.)

- [ ] **Step 6: Commit**

```bash
git add -A src/components/vehicle-picker src/app/[locale]/page.tsx src/messages/bg.json src/messages/en.json
git commit -m "feat: wire landing page to VehicleSelector, remove old dropdown picker"
```

---

### Task 12: End-to-end verification (both locales, full flow)

**Files:** none (verification only).

- [ ] **Step 1: Restart the dev server**

```bash
pkill -f "next dev" 2>/dev/null; sleep 1
cd /Users/gik986/Developer/APL-OIL-CHOOSER && npm run dev > /tmp/nextdev-redesign.log 2>&1 &
disown
sleep 4
```

- [ ] **Step 2: Run the full lint + type check**

```bash
npx tsc --noEmit
npx eslint .
```

Expected: both produce no output/errors.

- [ ] **Step 3: Playwright walkthrough of the golden path**

Write and run a script equivalent to:

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000/bg")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="/tmp/redesign-01-make-grid.png", full_page=True)
    # Cars should already be selected (default) -> make grid visible immediately

    page.locator("button", has_text="Audi").first.click()
    page.wait_for_timeout(500)
    page.screenshot(path="/tmp/redesign-02-model-grid.png", full_page=True)
    # breadcrumb should now show a "Cars" chip and an "Audi" chip

    page.get_by_role("button", name="A6").first.click()
    page.wait_for_timeout(500)
    page.screenshot(path="/tmp/redesign-03-type-table.png", full_page=True)
    # breadcrumb should now show Cars / Audi / A6 chips, and a sortable table below

    view_buttons = page.locator("button", has_text="Виж препоръки")
    view_buttons.first.click()
    page.wait_for_load_state("networkidle")
    print("landed on:", page.url)
    page.screenshot(path="/tmp/redesign-04-results.png", full_page=True)

    browser.close()
```

Expected: `landed on:` prints a `/bg/results/<some-typeId>` URL, and each screenshot shows the red/#BE0F0C accent, 3px-radius cards, and Open Sans font applied consistently.

- [ ] **Step 4: Verify chip removal cascades correctly**

Extend the same script (or a new one) to click the "Audi" chip's `×` after reaching the type table, and assert the model/type chips disappear and the make grid reappears — confirms `clearFromMake` correctly resets `model` alongside `make`.

- [ ] **Step 5: Repeat for `/en` locale**

Run the same script against `http://localhost:3000/en`, confirming the breadcrumb/table copy is in English (`fuelColumn` → "Fuel", `viewRecommendations` → "View recommendations", etc.) with no leftover Bulgarian or missing-key placeholders (next-intl renders `VehiclePicker.fuelColumn` literally if a key is missing — screenshots must not show any string containing a dot-separated key name).

- [ ] **Step 6: Final commit (if any fixups were needed during verification)**

```bash
git add -A
git commit -m "fix: address issues found during redesign verification"
```

(Skip this commit if verification passed with no changes needed.)
