# Eurol Brand Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user show recommendations from either Fuchs or Eurol. Vehicle navigation stays on Fuchs, and the browser remembers the last-chosen brand.

**Architecture:** A shared `Brand` type (`"fuchs" | "eurol"`) selects a
per-brand Olyslager config (dataset + subscription key) on the server. The
navigation endpoints are hardwired to Fuchs. The recommendations route takes
`?brand=`. On the client, a localStorage-backed `useBrandPreference` hook
drives a Fuchs | Eurol switch in `ResultsPanel`. It also threads the brand
down to `ProductCard` for the per-brand placeholder image.

**Tech Stack:** Next.js 16 App Router (route handlers), React 19, TypeScript, Tailwind v4, `next-intl`, Node's built-in `node --test` + `node:assert/strict` (no external test runner).

**Spec:** `docs/superpowers/specs/2026-10-09-eurol-brand-switch-design.md`

## Global Constraints

- Brands: exactly `"fuchs"` and `"eurol"` (lowercase). `DEFAULT_BRAND = "fuchs"`.
- Env vars: `OLYSLAGER_BASE_URL`, `OLYSLAGER_FUCHS_DATASET`,
  `OLYSLAGER_FUCHS_SUBSCRIPTION_KEY`, `OLYSLAGER_EUROL_DATASET` and
  `OLYSLAGER_EUROL_SUBSCRIPTION_KEY`.
  - A missing dataset or key throws `"<VAR_NAME> is not set"`.
  - There is no silent dataset fallback.
- Base URL fallback: `https://api.olyslager.com/rest/`.
- Navigation endpoints (categories, makes, models, types, search) always use Fuchs.
- localStorage key: `apl-oil-chooser:brand`.
- Placeholders: `/products/fuchs-no-image.jpg` and `/products/eurol-no-image.png`.
- Brand labels "Fuchs" / "Eurol" are not translated. The group label is
  translated under `Results.brandSwitchLabel`.
- Recommendations route:
  - When `brand` is absent, it uses Fuchs.
  - When `brand` is present and invalid, it returns
    `400 { error: "brand must be one of: fuchs, eurol" }`.
- Test files import siblings by relative path with the `.ts` extension, for
  example `./brand.ts`. `node --test` cannot resolve the `@/` alias. Any module
  a test loads at runtime must also import its runtime dependencies relatively.
  `import type` from `@/…` is fine, because it is erased.
- Full test suite: `node --test src/**/*.test.ts` (run from repo root).
- `server-only` throws when imported under plain Node, so anything unit-tested must not import `server-only` (directly or transitively).

## Review Focus

1. **Casing in the brand value:** `?brand=Eurol` or a stored `"EUROL"`. Matching is exact, so the route returns 400 and a stored value falls back to Fuchs. Pinned in Task 1 (`parseBrand`) and Task 2 (stored garbage).
2. **Eurol env var missing while Fuchs is set:** only Eurol recommendation
   requests should fail, with an error that names
   `OLYSLAGER_EUROL_SUBSCRIPTION_KEY`. Navigation keeps working. Pinned in
   Task 1 (`resolveOlyslagerConfig` per brand).
3. **Empty-string env values:** `OLYSLAGER_EUROL_DATASET=` must be treated as
   missing, not sent as an empty header. The same goes for an empty
   `OLYSLAGER_BASE_URL`, which falls back to the default. Pinned in Task 1.
4. **A stored Eurol preference on first render:** the panel must not fetch
   Fuchs and then refetch Eurol. Pinned by the `ready` gate in Task 2 and
   checked manually in Task 4 (Network tab shows one request).
5. **Eurol product with no `productCode` and no `productImage`:** Eurol omits
   these fields entirely, so they are `undefined`, not `null`. The card must
   still show the Eurol placeholder. Pinned in Task 3.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/lib/olyslager/brand.ts` | Create | `BRANDS`, `Brand`, `DEFAULT_BRAND`, `parseBrand`. Client and server safe. |
| `src/lib/olyslager/brand.test.ts` | Create | Tests for `parseBrand`. |
| `src/lib/olyslager/brand-config.ts` | Create | Pure `resolveOlyslagerConfig(brand, env)`. It is split out of `env.ts` so it can be tested without `server-only`. |
| `src/lib/olyslager/brand-config.test.ts` | Create | Tests for config resolution. |
| `src/lib/env.ts` | Modify | `getOlyslagerConfig(brand)` is a thin `server-only` wrapper over `resolveOlyslagerConfig(brand, process.env)`. |
| `src/lib/olyslager/client.ts` | Modify | `olyFetch` takes a brand. Navigation uses Fuchs, `getRecommendations(typeId, brand)` uses the given brand, and product names are trimmed. |
| `src/app/api/olyslager/recommendations/[typeId]/route.ts` | Modify | Parses and validates `?brand=`. |
| `.env.example`, `.gitignore` | Modify | New variables. `.env.example` is un-ignored so it is committed. |
| `src/lib/brand-preference.ts` | Create | localStorage get/set, following the `recent-searches.ts` pattern. |
| `src/lib/brand-preference.test.ts` | Create | Tests for preference persistence. |
| `src/hooks/use-brand-preference.ts` | Create | React hook `{ brand, setBrand, ready }`. |
| `src/components/results/product-image.ts` | Create | `getFallbackImage(brand)` and `initialImageSrc(product, brand)`. |
| `src/components/results/product-image.test.ts` | Create | Tests for image selection. |
| `src/components/results/product-card.tsx` | Modify | Takes a `brand` prop and uses `product-image.ts`. |
| `src/components/results/product-grid.tsx`, `product-use-section.tsx`, `component-accordion.tsx` | Modify | Pass `brand` through. |
| `src/components/results/brand-switch.tsx` | Create | Fuchs \| Eurol segmented switch. |
| `src/components/vehicle-selector/results-panel.tsx` | Modify | Uses the hook, renders the switch in every state, and adds `?brand=` to the fetch URL. |
| `src/messages/en.json`, `src/messages/bg.json` | Modify | `Results.brandSwitchLabel`. |
| `public/products/eurol-no-image.png` | Commit | Already on disk, untracked. |

---

### Task 1: Per-brand server config, client and recommendations route

After this task the app works again with the new `.env.local`. Today every
API call throws `OLYSLAGER_SUBSCRIPTION_KEY is not set`.

**Files:**
- Create: `src/lib/olyslager/brand.ts`
- Create: `src/lib/olyslager/brand.test.ts`
- Create: `src/lib/olyslager/brand-config.ts`
- Create: `src/lib/olyslager/brand-config.test.ts`
- Modify: `src/lib/env.ts` (whole file)
- Modify: `src/lib/olyslager/client.ts`, which covers `olyFetch` (lines 25-58),
  `sortRecommendation` (lines 70-86) and the `olyslager` object (lines 88-129)
- Modify: `src/app/api/olyslager/recommendations/[typeId]/route.ts` (whole file)
- Modify: `.env.example`, `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `BRANDS: readonly ["fuchs", "eurol"]`, `type Brand = "fuchs" | "eurol"`, `DEFAULT_BRAND: Brand`, `parseBrand(value: unknown): Brand | null`. All of these come from `src/lib/olyslager/brand.ts`.
  - `interface OlyslagerConfig { baseUrl: string; dataset: string; subscriptionKey: string }`, `DEFAULT_BASE_URL`, and `resolveOlyslagerConfig(brand: Brand, env: Record<string, string | undefined>): OlyslagerConfig`. These come from `src/lib/olyslager/brand-config.ts`.
  - `getOlyslagerConfig(brand: Brand): OlyslagerConfig` from `src/lib/env.ts`.
  - `olyslager.getRecommendations(typeId: number, brand: Brand): Promise<Recommendation>`.
  - `GET /api/olyslager/recommendations/:typeId?brand=fuchs|eurol`.

- [ ] **Step 1: Write the failing `parseBrand` test**

Create `src/lib/olyslager/brand.test.ts`:

```ts
// src/lib/olyslager/brand.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { BRANDS, DEFAULT_BRAND, parseBrand } from "./brand.ts";

test("BRANDS lists fuchs then eurol, and fuchs is the default", () => {
  assert.deepEqual([...BRANDS], ["fuchs", "eurol"]);
  assert.equal(DEFAULT_BRAND, "fuchs");
});

test("parseBrand accepts the exact lowercase brand ids", () => {
  assert.equal(parseBrand("fuchs"), "fuchs");
  assert.equal(parseBrand("eurol"), "eurol");
});

test("parseBrand rejects other casing, unknown ids and non-strings", () => {
  for (const value of ["Eurol", "EUROL", " eurol", "", "total", null, undefined, 1, {}, ["eurol"]]) {
    assert.equal(parseBrand(value), null, `expected null for ${JSON.stringify(value)}`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test src/lib/olyslager/brand.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (cannot find `./brand.ts`).

- [ ] **Step 3: Implement `brand.ts`**

Create `src/lib/olyslager/brand.ts`:

```ts
// Product brands we have a licensed Olyslager dataset for. Vehicle navigation
// always runs against Fuchs; only recommendations follow the selected brand.
export const BRANDS = ["fuchs", "eurol"] as const;

export type Brand = (typeof BRANDS)[number];

export const DEFAULT_BRAND: Brand = "fuchs";

export function parseBrand(value: unknown): Brand | null {
  return typeof value === "string" && (BRANDS as readonly string[]).includes(value)
    ? (value as Brand)
    : null;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test src/lib/olyslager/brand.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing config test**

Create `src/lib/olyslager/brand-config.test.ts`:

```ts
// src/lib/olyslager/brand-config.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BASE_URL, resolveOlyslagerConfig } from "./brand-config.ts";

const FULL_ENV = {
  OLYSLAGER_BASE_URL: "https://example.test/rest/",
  OLYSLAGER_FUCHS_DATASET: "fuchs_eu",
  OLYSLAGER_FUCHS_SUBSCRIPTION_KEY: "fuchs-key",
  OLYSLAGER_EUROL_DATASET: "eurol-auto-plus",
  OLYSLAGER_EUROL_SUBSCRIPTION_KEY: "eurol-key",
};

test("resolves each brand to its own dataset and key with the shared base URL", () => {
  assert.deepEqual(resolveOlyslagerConfig("fuchs", FULL_ENV), {
    baseUrl: "https://example.test/rest/",
    dataset: "fuchs_eu",
    subscriptionKey: "fuchs-key",
  });
  assert.deepEqual(resolveOlyslagerConfig("eurol", FULL_ENV), {
    baseUrl: "https://example.test/rest/",
    dataset: "eurol-auto-plus",
    subscriptionKey: "eurol-key",
  });
});

test("falls back to the default base URL when unset or empty", () => {
  assert.equal(resolveOlyslagerConfig("fuchs", { ...FULL_ENV, OLYSLAGER_BASE_URL: undefined }).baseUrl, DEFAULT_BASE_URL);
  assert.equal(resolveOlyslagerConfig("fuchs", { ...FULL_ENV, OLYSLAGER_BASE_URL: "" }).baseUrl, DEFAULT_BASE_URL);
  assert.equal(DEFAULT_BASE_URL, "https://api.olyslager.com/rest/");
});

test("a missing Eurol key only breaks Eurol and names the exact variable", () => {
  const env = { ...FULL_ENV, OLYSLAGER_EUROL_SUBSCRIPTION_KEY: undefined };
  assert.equal(resolveOlyslagerConfig("fuchs", env).subscriptionKey, "fuchs-key");
  assert.throws(() => resolveOlyslagerConfig("eurol", env), {
    message: "OLYSLAGER_EUROL_SUBSCRIPTION_KEY is not set",
  });
});

test("a missing or empty dataset throws instead of falling back to another dataset", () => {
  assert.throws(() => resolveOlyslagerConfig("eurol", { ...FULL_ENV, OLYSLAGER_EUROL_DATASET: undefined }), {
    message: "OLYSLAGER_EUROL_DATASET is not set",
  });
  assert.throws(() => resolveOlyslagerConfig("fuchs", { ...FULL_ENV, OLYSLAGER_FUCHS_DATASET: "" }), {
    message: "OLYSLAGER_FUCHS_DATASET is not set",
  });
});

test("an empty key is treated as missing", () => {
  assert.throws(() => resolveOlyslagerConfig("fuchs", { ...FULL_ENV, OLYSLAGER_FUCHS_SUBSCRIPTION_KEY: "" }), {
    message: "OLYSLAGER_FUCHS_SUBSCRIPTION_KEY is not set",
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `node --test src/lib/olyslager/brand-config.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (cannot find `./brand-config.ts`).

- [ ] **Step 7: Implement `brand-config.ts`**

Create `src/lib/olyslager/brand-config.ts`:

```ts
import type { Brand } from "./brand";

export interface OlyslagerConfig {
  baseUrl: string;
  dataset: string;
  subscriptionKey: string;
}

export const DEFAULT_BASE_URL = "https://api.olyslager.com/rest/";

// Kept free of `server-only` so it can be unit-tested under plain Node;
// `getOlyslagerConfig` in `@/lib/env` is the server-only entry point.
// Each brand must name its own dataset explicitly — falling back to another
// brand's dataset would silently show the wrong manufacturer's products.
export function resolveOlyslagerConfig(
  brand: Brand,
  env: Record<string, string | undefined>,
): OlyslagerConfig {
  const prefix = `OLYSLAGER_${brand.toUpperCase()}`;
  return {
    baseUrl: env.OLYSLAGER_BASE_URL || DEFAULT_BASE_URL,
    dataset: required(env, `${prefix}_DATASET`),
    subscriptionKey: required(env, `${prefix}_SUBSCRIPTION_KEY`),
  };
}

function required(env: Record<string, string | undefined>, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `node --test src/lib/olyslager/brand-config.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 9: Replace `src/lib/env.ts`**

Replace the whole file with:

```ts
import "server-only";
import type { Brand } from "@/lib/olyslager/brand";
import { resolveOlyslagerConfig, type OlyslagerConfig } from "@/lib/olyslager/brand-config";

export function getOlyslagerConfig(brand: Brand): OlyslagerConfig {
  return resolveOlyslagerConfig(brand, process.env);
}
```

- [ ] **Step 10: Update `src/lib/olyslager/client.ts`**

10a. Add the brand import under the existing `getOlyslagerConfig` import:

```ts
import { getOlyslagerConfig } from "@/lib/env";
import type { Brand } from "./brand";
```

10b. Change the `olyFetch` signature and its first line (currently
`async function olyFetch<T>(path: string, params: …, opts: FetchOpts = {})`
and `const { baseUrl, dataset, subscriptionKey } = getOlyslagerConfig();`) to:

```ts
async function olyFetch<T>(
  brand: Brand,
  path: string,
  params: Record<string, string | number | undefined>,
  opts: FetchOpts = {},
): Promise<T> {
  const { baseUrl, dataset, subscriptionKey } = getOlyslagerConfig(brand);
```

The rest of `olyFetch` stays unchanged. `x-oly-dataset` now differs per
brand, and Next's fetch cache key includes request headers, so Fuchs and
Eurol responses never share a cache entry.

10c. In `sortRecommendation`, trim product names, because Eurol sends trailing
tabs such as `"Eurol Coolant -36°C GLS 13\t\t\t\t\t"`. Change the inner product
map to:

```ts
          .map((product) => ({
            ...product,
            productName: product.productName.trim(),
            intervals: [...product.intervals].sort((a, b) => a.appOrder - b.appOrder),
          })),
```

10d. Replace the `export const olyslager = { … };` block with:

```ts
// Vehicle navigation (categories → makes → models → types, plus free-text
// search) always runs against the Fuchs dataset. Vehicle ids are shared
// across our Olyslager datasets, so a Fuchs typeId is valid for every brand's
// recommendations.
const NAVIGATION_BRAND: Brand = "fuchs";

export const olyslager = {
  getCategories: () =>
    olyFetch<Category[]>(
      NAVIGATION_BRAND,
      "categories",
      { language: DATA_LANGUAGE },
      { revalidate: REFERENCE_DATA_REVALIDATE },
    ),

  getMakes: (categoryId: number) =>
    olyFetch<Make[]>(
      NAVIGATION_BRAND,
      "makes",
      { language: DATA_LANGUAGE, categoryId },
      { revalidate: REFERENCE_DATA_REVALIDATE },
    ),

  getModels: (makeId: number) =>
    olyFetch<Model[]>(
      NAVIGATION_BRAND,
      "models",
      { language: DATA_LANGUAGE, makeId },
      { revalidate: REFERENCE_DATA_REVALIDATE },
    ),

  getTypes: (modelId: number) =>
    olyFetch<VehicleType[]>(
      NAVIGATION_BRAND,
      "types",
      { language: DATA_LANGUAGE, modelId },
      { revalidate: REFERENCE_DATA_REVALIDATE },
    ),

  getRecommendations: (typeId: number, brand: Brand) =>
    olyFetch<Recommendation>(
      brand,
      `recommendations/${typeId}`,
      { language: DATA_LANGUAGE },
      { revalidate: RECOMMENDATION_REVALIDATE },
    ).then(sortRecommendation),

  search: (searchText: string, searchCount = 20, facetCount = 10) =>
    olyFetch<SearchResponse>(
      NAVIGATION_BRAND,
      "search",
      { language: DATA_LANGUAGE, searchText, searchCount, facetCount },
      { cache: "no-store" },
    ),
};
```

- [ ] **Step 11: Replace the recommendations route**

Replace `src/app/api/olyslager/recommendations/[typeId]/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { olyslager, OlyslagerApiError } from "@/lib/olyslager/client";
import { BRANDS, DEFAULT_BRAND, parseBrand } from "@/lib/olyslager/brand";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ typeId: string }> },
) {
  const { typeId: typeIdParam } = await params;
  const typeId = Number(typeIdParam);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    return NextResponse.json({ error: "typeId must be a positive integer" }, { status: 400 });
  }

  // Absent → Fuchs, so pre-existing callers keep working; present but unknown → 400.
  const brandParam = new URL(request.url).searchParams.get("brand");
  const brand = brandParam === null ? DEFAULT_BRAND : parseBrand(brandParam);
  if (!brand) {
    return NextResponse.json({ error: `brand must be one of: ${BRANDS.join(", ")}` }, { status: 400 });
  }

  try {
    const recommendation = await olyslager.getRecommendations(typeId, brand);
    return NextResponse.json(recommendation);
  } catch (err) {
    if (err instanceof OlyslagerApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502;
      return NextResponse.json({ error: "Failed to load recommendations" }, { status });
    }
    throw err;
  }
}
```

- [ ] **Step 12: Update `.env.example` and un-ignore it**

Replace `.env.example` with:

```
OLYSLAGER_BASE_URL=https://api.olyslager.com/rest/
OLYSLAGER_FUCHS_DATASET=fuchs_eu
OLYSLAGER_FUCHS_SUBSCRIPTION_KEY=
OLYSLAGER_EUROL_DATASET=eurol-auto-plus
OLYSLAGER_EUROL_SUBSCRIPTION_KEY=
```

In `.gitignore`, add the exception line directly under the existing `.env*` line (line 34):

```
.env*
!.env.example
```

Verify: `git check-ignore -v .env.example` prints nothing and exits 1.

- [ ] **Step 13: Typecheck, lint and the full test suite**

Run: `npx tsc --noEmit && npm run lint && node --test src/**/*.test.ts`
Expected: no type errors, no lint errors, all tests pass.

- [ ] **Step 14: Smoke-test the API against the real datasets**

Start the dev server with `npm run dev`, either in the background or in a
second terminal, and wait for `Ready`. Then run:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/olyslager/categories"
curl -s "http://localhost:3000/api/olyslager/recommendations/73434" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['components'][0]['productRecommendations'][0]['productName'])"
curl -s "http://localhost:3000/api/olyslager/recommendations/73434?brand=eurol" | python3 -c "import json,sys;d=json.load(sys.stdin);print([p['productName'] for c in d['components'] for p in c['productRecommendations']][:3])"
curl -s -w " %{http_code}\n" "http://localhost:3000/api/olyslager/recommendations/73434?brand=Eurol"
```

Expected:
- The categories request prints `200`.
- The no-brand request prints a Fuchs product name, for example `TITAN …`.
- The `?brand=eurol` request prints `Eurol …` names with no trailing `\t`.
- The last request prints `{"error":"brand must be one of: fuchs, eurol"} 400`.

Stop the dev server.

- [ ] **Step 15: Commit**

```bash
git add src/lib/olyslager/brand.ts src/lib/olyslager/brand.test.ts src/lib/olyslager/brand-config.ts src/lib/olyslager/brand-config.test.ts src/lib/env.ts src/lib/olyslager/client.ts "src/app/api/olyslager/recommendations/[typeId]/route.ts" .env.example .gitignore
git commit -m "feat: per-brand Olyslager config with Fuchs navigation and brand-aware recommendations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Brand preference persistence and hook

**Files:**
- Create: `src/lib/brand-preference.ts`
- Create: `src/lib/brand-preference.test.ts`
- Create: `src/hooks/use-brand-preference.ts`

**Interfaces:**
- Consumes: `Brand`, `DEFAULT_BRAND` and `parseBrand` from `src/lib/olyslager/brand.ts` (Task 1).
- Produces:
  - `BRAND_STORAGE_KEY = "apl-oil-chooser:brand"`, `getBrandPreference(): Brand` and `setBrandPreference(brand: Brand): void`, from `src/lib/brand-preference.ts`.
  - `useBrandPreference(): { brand: Brand; setBrand: (brand: Brand) => void; ready: boolean }`, from `src/hooks/use-brand-preference.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/brand-preference.test.ts`:

```ts
// src/lib/brand-preference.test.ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { BRAND_STORAGE_KEY, getBrandPreference, setBrandPreference } from "./brand-preference.ts";

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

beforeEach(() => {
  installFakeLocalStorage();
});

test("defaults to fuchs when nothing is stored", () => {
  assert.equal(getBrandPreference(), "fuchs");
});

test("round-trips eurol under the documented key", () => {
  setBrandPreference("eurol");
  assert.equal(localStorage.getItem(BRAND_STORAGE_KEY), "eurol");
  assert.equal(BRAND_STORAGE_KEY, "apl-oil-chooser:brand");
  assert.equal(getBrandPreference(), "eurol");
  setBrandPreference("fuchs");
  assert.equal(getBrandPreference(), "fuchs");
});

test("falls back to fuchs for garbage or differently-cased stored values", () => {
  for (const value of ["EUROL", "Eurol", "total", "", '"eurol"']) {
    localStorage.setItem(BRAND_STORAGE_KEY, value);
    assert.equal(getBrandPreference(), "fuchs", `expected fuchs for ${JSON.stringify(value)}`);
  }
});

test("falls back to fuchs when getItem throws", () => {
  localStorage.getItem = () => {
    throw new Error("SecurityError");
  };
  assert.equal(getBrandPreference(), "fuchs");
});

test("swallows setItem errors", () => {
  localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.doesNotThrow(() => setBrandPreference("eurol"));
});

test("works when localStorage is undefined (server render)", () => {
  delete (globalThis as { localStorage?: Storage }).localStorage;
  assert.equal(getBrandPreference(), "fuchs");
  assert.doesNotThrow(() => setBrandPreference("eurol"));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test src/lib/brand-preference.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (cannot find `./brand-preference.ts`).

- [ ] **Step 3: Implement `brand-preference.ts`**

Create `src/lib/brand-preference.ts`. The import is relative with a `.ts`
extension, because `node --test` loads this file at runtime and cannot resolve
`@/`. `allowImportingTsExtensions` is already on in `tsconfig.json`.

```ts
import { DEFAULT_BRAND, parseBrand, type Brand } from "./olyslager/brand.ts";

export const BRAND_STORAGE_KEY = "apl-oil-chooser:brand";

export function getBrandPreference(): Brand {
  if (typeof localStorage === "undefined") return DEFAULT_BRAND;

  try {
    return parseBrand(localStorage.getItem(BRAND_STORAGE_KEY)) ?? DEFAULT_BRAND;
  } catch {
    return DEFAULT_BRAND;
  }
}

export function setBrandPreference(brand: Brand): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(BRAND_STORAGE_KEY, brand);
  } catch {
    // localStorage can throw (quota exceeded, private-browsing restrictions) —
    // the switch still works for this session, it just isn't remembered.
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test src/lib/brand-preference.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Implement the hook**

Create `src/hooks/use-brand-preference.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_BRAND, type Brand } from "@/lib/olyslager/brand";
import { getBrandPreference, setBrandPreference } from "@/lib/brand-preference";

interface UseBrandPreferenceResult {
  brand: Brand;
  setBrand: (brand: Brand) => void;
  /** False until the stored preference has been read; callers should hold off fetching until then. */
  ready: boolean;
}

export function useBrandPreference(): UseBrandPreferenceResult {
  // The server can't see localStorage, so the first render is always the
  // default; the stored value is applied on mount to avoid a hydration mismatch.
  const [state, setState] = useState<{ brand: Brand; ready: boolean }>({
    brand: DEFAULT_BRAND,
    ready: false,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local state from localStorage once on mount, same pattern as useRecentSearches
    setState({ brand: getBrandPreference(), ready: true });
  }, []);

  const setBrand = useCallback((brand: Brand) => {
    setState({ brand, ready: true });
    setBrandPreference(brand);
  }, []);

  return { brand: state.brand, setBrand, ready: state.ready };
}
```

- [ ] **Step 6: Typecheck, lint and the full test suite**

Run: `npx tsc --noEmit && npm run lint && node --test src/**/*.test.ts`
Expected: everything passes, including the `.ts`-extension import in `brand-preference.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/brand-preference.ts src/lib/brand-preference.test.ts src/hooks/use-brand-preference.ts
git commit -m "feat: persist selected product brand in localStorage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Per-brand product placeholder image

**Files:**
- Create: `src/components/results/product-image.ts`
- Create: `src/components/results/product-image.test.ts`
- Modify: `src/components/results/product-card.tsx` (lines 1-46)
- Modify: `src/components/results/product-grid.tsx` (whole file)
- Modify: `src/components/results/product-use-section.tsx` (whole file)
- Modify: `src/components/results/component-accordion.tsx` (the `ComponentAccordion` signature and its `ProductUseSection` call)
- Commit: `public/products/eurol-no-image.png` (already on disk)

**Interfaces:**
- Consumes: `type Brand` from `src/lib/olyslager/brand.ts` (Task 1).
- Produces:
  - `getFallbackImage(brand: Brand): string` and `initialImageSrc(product: Pick<ProductRecommendation, "productImage" | "productCode">, brand: Brand): string`.
  - New required props: `ComponentAccordion({ component, brand })`, `ProductUseSection({ group, brand })`, `ProductGrid({ products, brand })` and `ProductCard({ product, brand })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/results/product-image.test.ts`:

```ts
// src/components/results/product-image.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getFallbackImage, initialImageSrc } from "./product-image.ts";

test("each brand has its own placeholder", () => {
  assert.equal(getFallbackImage("fuchs"), "/products/fuchs-no-image.jpg");
  assert.equal(getFallbackImage("eurol"), "/products/eurol-no-image.png");
});

test("an API productImage wins over everything", () => {
  assert.equal(
    initialImageSrc({ productImage: "https://cdn.test/p.png", productCode: "E504149" }, "eurol"),
    "https://cdn.test/p.png",
  );
});

test("otherwise the local photo named after productCode is tried", () => {
  assert.equal(initialImageSrc({ productImage: "", productCode: "CP1003290" }, "fuchs"), "/products/CP1003290.jpg");
  assert.equal(initialImageSrc({ productImage: null, productCode: "E504149" }, "eurol"), "/products/E504149.jpg");
});

test("with neither, the selected brand's placeholder is used", () => {
  assert.equal(initialImageSrc({ productImage: "", productCode: null }, "fuchs"), "/products/fuchs-no-image.jpg");
  assert.equal(initialImageSrc({ productImage: null, productCode: null }, "eurol"), "/products/eurol-no-image.png");
});

test("Eurol records omit the fields entirely (undefined) and still get the Eurol placeholder", () => {
  const eurolRecord = {} as { productImage: string | null; productCode: string | null };
  assert.equal(initialImageSrc(eurolRecord, "eurol"), "/products/eurol-no-image.png");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test src/components/results/product-image.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (cannot find `./product-image.ts`).

- [ ] **Step 3: Implement `product-image.ts`**

Create `src/components/results/product-image.ts`:

```ts
import type { Brand } from "@/lib/olyslager/brand";
import type { ProductRecommendation } from "@/lib/olyslager/types";

const FALLBACK_IMAGES: Record<Brand, string> = {
  fuchs: "/products/fuchs-no-image.jpg",
  eurol: "/products/eurol-no-image.png",
};

export function getFallbackImage(brand: Brand): string {
  return FALLBACK_IMAGES[brand];
}

// Local product photos are named after productCode (e.g. "/products/CP1003290.jpg").
// productImage from the API is empty (Fuchs) or absent (Eurol) today, but takes
// priority if a dataset ever populates it. If neither exists — or the guessed
// local file 404s, which ProductCard handles via onError — the selected brand's
// placeholder is shown.
export function initialImageSrc(
  product: Pick<ProductRecommendation, "productImage" | "productCode">,
  brand: Brand,
): string {
  if (product.productImage) return product.productImage;
  if (product.productCode) return `/products/${product.productCode}.jpg`;
  return getFallbackImage(brand);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test src/components/results/product-image.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Use it in `ProductCard`**

In `src/components/results/product-card.tsx`:

5a. Add these imports next to the existing ones:

```ts
import { getFallbackImage, initialImageSrc } from "./product-image";
import type { Brand } from "@/lib/olyslager/brand";
```

5b. Delete the local `FALLBACK_IMAGE` constant, the comment block above
`initialImageSrc`, and the local `initialImageSrc` function (current lines 12-22).

5c. Change the component signature and state initialiser to:

```tsx
export function ProductCard({ product, brand }: { product: ProductRecommendation; brand: Brand }) {
  const [src, setSrc] = useState(() => initialImageSrc(product, brand));
```

5d. Change the `onError` handler to:

```tsx
          onError={() => setSrc(getFallbackImage(brand))}
```

- [ ] **Step 6: Thread `brand` through the parents**

Replace `src/components/results/product-grid.tsx` with:

```tsx
import { ProductCard } from "./product-card";
import type { Brand } from "@/lib/olyslager/brand";
import type { ProductRecommendation } from "@/lib/olyslager/types";

export function ProductGrid({ products, brand }: { products: ProductRecommendation[]; brand: Brand }) {
  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => (
        <ProductCard
          key={`${product.productCode ?? product.productName}-${index}`}
          product={product}
          brand={brand}
        />
      ))}
    </div>
  );
}
```

In `src/components/results/product-use-section.tsx`, add
`import type { Brand } from "@/lib/olyslager/brand";` and change the signature
and the grid call:

```tsx
export function ProductUseSection({ group, brand }: { group: ProductUseGroup; brand: Brand }) {
```

```tsx
      <ProductGrid products={group.products} brand={brand} />
```

In `src/components/results/component-accordion.tsx`, add
`import type { Brand } from "@/lib/olyslager/brand";` and change the signature
and the section call:

```tsx
export function ComponentAccordion({ component, brand }: { component: RecommendationComponent; brand: Brand }) {
```

```tsx
          groups.map((group) => <ProductUseSection key={group.useName} group={group} brand={brand} />)
```

- [ ] **Step 7: Temporarily pass the default brand from `ResultsPanel`**

Task 4 wires this up properly. To keep this task compiling, change the
accordion line in `src/components/vehicle-selector/results-panel.tsx` to:

```tsx
            <ComponentAccordion key={component.id} component={component} brand={DEFAULT_BRAND} />
```

Add `import { DEFAULT_BRAND } from "@/lib/olyslager/brand";` to the imports.

- [ ] **Step 8: Typecheck, lint and the full test suite**

Run: `npx tsc --noEmit && npm run lint && node --test src/**/*.test.ts`
Expected: everything passes.

- [ ] **Step 9: Commit**

```bash
git add src/components/results/product-image.ts src/components/results/product-image.test.ts src/components/results/product-card.tsx src/components/results/product-grid.tsx src/components/results/product-use-section.tsx src/components/results/component-accordion.tsx src/components/vehicle-selector/results-panel.tsx public/products/eurol-no-image.png
git commit -m "feat: per-brand product placeholder image

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Fuchs | Eurol switch on the results panel

**Files:**
- Create: `src/components/results/brand-switch.tsx`
- Modify: `src/components/vehicle-selector/results-panel.tsx` (whole file)
- Modify: `src/messages/en.json` and `src/messages/bg.json` (the `Results` object)

**Interfaces:**
- Consumes:
  - `useBrandPreference()` (Task 2).
  - `BRANDS` and `type Brand` (Task 1).
  - `ComponentAccordion({ component, brand })` (Task 3).
  - `GET /api/olyslager/recommendations/:typeId?brand=` (Task 1).
- Produces:
  - `BrandSwitch({ value: Brand; onChange: (brand: Brand) => void })`.
  - The translation key `Results.brandSwitchLabel`.

- [ ] **Step 1: Add translations**

In `src/messages/en.json`, add this to the `Results` object after `"fuelLabel": "Fuel"`:

```json
    "brandSwitchLabel": "Product brand"
```

In `src/messages/bg.json`, add this to the `Results` object after `"fuelLabel": "Гориво"`:

```json
    "brandSwitchLabel": "Марка продукти"
```

Add a comma after the preceding entry in both files. Then validate both files:
`node -e "for (const f of ['en','bg']) console.log(f, require('./src/messages/'+f+'.json').Results.brandSwitchLabel)"`.
Expected: `en Product brand` and `bg Марка продукти`.

- [ ] **Step 2: Create the switch**

Create `src/components/results/brand-switch.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { BRANDS, type Brand } from "@/lib/olyslager/brand";

// Brand names are proper nouns — deliberately not translated.
const BRAND_LABELS: Record<Brand, string> = {
  fuchs: "Fuchs",
  eurol: "Eurol",
};

interface BrandSwitchProps {
  value: Brand;
  onChange: (brand: Brand) => void;
}

export function BrandSwitch({ value, onChange }: BrandSwitchProps) {
  const t = useTranslations("Results");

  return (
    <div className="flex items-center gap-2">
      <span id="brand-switch-label" className="text-sm text-muted-foreground">
        {t("brandSwitchLabel")}
      </span>
      <div
        role="group"
        aria-labelledby="brand-switch-label"
        className="inline-flex gap-1 rounded-lg border border-border p-1"
      >
        {BRANDS.map((brand) => {
          const active = brand === value;
          return (
            <Button
              key={brand}
              type="button"
              size="sm"
              variant={active ? "default" : "ghost"}
              aria-pressed={active}
              onClick={() => {
                if (!active) onChange(brand);
              }}
            >
              {BRAND_LABELS[brand]}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire the switch into `ResultsPanel`**

Replace `src/components/vehicle-selector/results-panel.tsx` with the code
below. `ResultsPanel` is mounted with `key={typeId}` in `vehicle-selector.tsx`,
so the hook re-reads the stored brand on every new vehicle. That is cheap and
keeps the brand state local to the panel.

```tsx
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useOlyslagerResource } from "@/hooks/use-olyslager-resource";
import { useBrandPreference } from "@/hooks/use-brand-preference";
import { VehicleSidebarCard } from "@/components/results/vehicle-sidebar-card";
import { ComponentAccordion } from "@/components/results/component-accordion";
import { BrandSwitch } from "@/components/results/brand-switch";
import { Accordion } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Brand } from "@/lib/olyslager/brand";
import type { Recommendation } from "@/lib/olyslager/types";

interface ResultsPanelProps {
  typeId: number;
  onLoaded?: (recommendation: Recommendation) => void;
}

export function ResultsPanel({ typeId, onLoaded }: ResultsPanelProps) {
  const { brand, setBrand, ready } = useBrandPreference();

  return (
    <div className="flex flex-col gap-4">
      <BrandSwitch value={brand} onChange={setBrand} />
      {/* Wait for the stored brand before fetching so a user who last chose
          Eurol doesn't trigger a throwaway Fuchs request on mount. */}
      <ResultsBody
        url={ready ? `/api/olyslager/recommendations/${typeId}?brand=${brand}` : null}
        brand={brand}
        onLoaded={onLoaded}
      />
    </div>
  );
}

function ResultsBody({
  url,
  brand,
  onLoaded,
}: {
  url: string | null;
  brand: Brand;
  onLoaded?: (recommendation: Recommendation) => void;
}) {
  const t = useTranslations("Results");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerResource<Recommendation>(url);

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
        <Skeleton className="h-64 w-full lg:w-80 lg:shrink-0" />
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
        <aside className="lg:w-80 lg:shrink-0">
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
            <ComponentAccordion key={component.id} component={component} brand={brand} />
          ))}
        </Accordion>
      </div>
      <aside className="lg:w-80 lg:shrink-0">
        <VehicleSidebarCard vehicle={data} />
      </aside>
    </div>
  );
}
```

This full-file replacement drops the temporary `DEFAULT_BRAND` import from
Task 3 Step 7, which is intended.

- [ ] **Step 4: Typecheck, lint and the full test suite**

Run: `npx tsc --noEmit && npm run lint && node --test src/**/*.test.ts`
Expected: everything passes.

- [ ] **Step 5: Manual browser check**

Start the dev server with `npm run dev` and open `http://localhost:3000/bg`.
Then check the following:

1. Navigate Cars → Volkswagen (VW) (EU) → any model → any type, or use search.
   - The switch shows "Марка продукти: Fuchs | Eurol" with Fuchs active.
   - The products are Fuchs (TITAN …).
   - Cards without a local photo show the Fuchs placeholder.
2. Click **Eurol**.
   - The skeleton flashes and the same vehicle stays selected in the sidebar.
   - Products are now "Eurol …" and cards show the Eurol placeholder.
3. Reload the page, or go back and pick another vehicle. Eurol is still active.
4. With Eurol stored, open DevTools → Network and filter on `recommendations`,
   then reload. Exactly **one** request is sent, and it carries `?brand=eurol`.
   No `?brand=fuchs` request goes out first.
5. Switch to `/en`. The label reads "Product brand".
6. In DevTools → Application → Local Storage, set `apl-oil-chooser:brand` to
   `EUROL` and reload. Fuchs is active.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/results/brand-switch.tsx src/components/vehicle-selector/results-panel.tsx src/messages/en.json src/messages/bg.json
git commit -m "feat: Fuchs/Eurol switch on the recommendations panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Final verification

**Files:** none. This task only verifies.

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: the build succeeds with no type or lint errors. This also confirms
that Turbopack accepts the `.ts`-extension import in `src/lib/brand-preference.ts`.

- [ ] **Step 2: Full suite once more**

Run: `node --test src/**/*.test.ts`
Expected: all tests pass, including the four new test files, which hold 3, 5, 6 and 5 tests.

- [ ] **Step 3: Report deployment prerequisites to the user**

These cannot be done from here, so tell the user:

- The production `.env.local` on the server needs all five `OLYSLAGER_*`
  variables before the new image is deployed. The current image still reads
  the old names.
- Copy `eurol-no-image.png` into the server's `products-photos/` directory,
  because `docker-compose.prod.yml` mounts it over `/app/public/products`.
- In TM1, check manually that clicking a Eurol product (for example
  `E504149`) opens a matching article list.
