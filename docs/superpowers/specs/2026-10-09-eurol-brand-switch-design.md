# Eurol Brand Switch for Recommendations

## Context

The 2026-07-16 results redesign spec paused Eurol integration because the
only route to Eurol data at the time was scraping Eurol's public site. That
blocker no longer applies: we now have our own licensed Olyslager dataset for
Eurol (`eurol-auto-plus`) with its own subscription key, served by the same
Olyslager REST API we already use for Fuchs (`fuchs_eu`).

`.env.local` has already been switched to per-brand variables:

```
OLYSLAGER_BASE_URL=...
OLYSLAGER_FUCHS_DATASET=fuchs_eu
OLYSLAGER_FUCHS_SUBSCRIPTION_KEY=...
OLYSLAGER_EUROL_DATASET=eurol-auto-plus
OLYSLAGER_EUROL_SUBSCRIPTION_KEY=...
```

`src/lib/env.ts` still reads the old `OLYSLAGER_DATASET` /
`OLYSLAGER_SUBSCRIPTION_KEY`, so every API call currently throws
`OLYSLAGER_SUBSCRIPTION_KEY is not set`. Production has the same problem as
soon as its `.env.local` gets the new names, because `docker-compose.prod.yml`
loads that file as `env_file`.

### Verified against live data (2026-10-09)

- Vehicle IDs are shared across both datasets. Category 1 makes match
  158/158 with identical IDs and names. Volkswagen (VW) (EU) (`910036`) has
  97/97 models in both, and the sampled model has 11/11 types in both.
- Type `73434` returns 7 components from each dataset, with different
  products. Fuchs returns TITAN GT1 PRO C-3 5W-30 / `CP1003290`. Eurol returns
  Eurol Coolant -36°C GLS 13 / `E504149` and Eurol Brake Fluid DOT 4 LV /
  `E801410`.
- Eurol has three categories Fuchs lacks: 9, 31 and 32. Fuchs has 1, 2, 3,
  4, 5 and 10. Eurol has those six plus 9, 31 and 32.
- Eurol product records omit `productImage`, `productUrl`, `productPds` and
  `productMsds` entirely. Fuchs sends them as empty strings. Eurol
  `productName` can also carry trailing tab characters.

## Goals

- Vehicle navigation always uses the **Fuchs** dataset: categories, makes,
  models, types and free-text search.
- **Recommendations** come from the brand the user selected: Fuchs or Eurol.
- The user switches brand on the recommendations screen. Switching refetches
  recommendations for the same `typeId` and keeps the selected vehicle.
- The selected brand is stored in the browser (localStorage). The next visit
  opens on the last-used brand. With nothing stored, or with an unreadable
  value, the default is Fuchs.
- Each brand has its own product-image placeholder:
  `/products/fuchs-no-image.jpg` and `/products/eurol-no-image.png`.

## Non-goals

- No brand switch on the navigation steps. Navigation always uses Fuchs, so a
  switch there would change nothing visible.
- No Eurol-only categories (9, 31, 32). They are not reachable because
  navigation is Fuchs-only.
- No brand in the URL and no `?brand=` from TM1. This can be added later if
  TM1 needs to deep-link to a brand.
- No merged or side-by-side Fuchs + Eurol results.
- No change to recent searches. An entry is a vehicle (`typeId`), and opening
  it shows the currently selected brand.

## Design

### 1. Brand type and config (`src/lib/env.ts`)

- Add `src/lib/olyslager/brand.ts`. It must not be server-only, because the
  client imports it too. It contains:
  - `export const BRANDS = ["fuchs", "eurol"] as const;`
  - `export type Brand = (typeof BRANDS)[number];`
  - `export const DEFAULT_BRAND: Brand = "fuchs";`
  - `export function parseBrand(value: unknown): Brand | null`. It returns
    the brand for an exact match in `BRANDS` and `null` for anything else.
- `getOlyslagerConfig(brand: Brand)` reads
  `OLYSLAGER_${BRAND}_DATASET` and `OLYSLAGER_${BRAND}_SUBSCRIPTION_KEY`, with
  `BRAND` upper-cased.
  - A missing key throws `OLYSLAGER_EUROL_SUBSCRIPTION_KEY is not set` (or
    the FUCHS equivalent). The error names the exact variable.
  - A missing dataset also throws. Each brand gets an explicit dataset in
    config, and there is no silent `fuchs_eu` fallback. A missing Eurol dataset
    must not quietly return Fuchs products.
  - The base URL stays shared. It reads `OLYSLAGER_BASE_URL` and falls back to
    `https://api.olyslager.com/rest/`.
- `.env.example` is updated to the five variables above, with empty keys.
  `.gitignore` currently ignores it through `.env*`, so add a
  `!.env.example` exception and commit the file.

### 2. Olyslager client (`src/lib/olyslager/client.ts`)

- `olyFetch` takes a `brand: Brand` argument and passes it to
  `getOlyslagerConfig`.
- `getCategories`, `getMakes`, `getModels`, `getTypes` and `search` always
  pass `"fuchs"`. A short comment states the rule that navigation is always
  Fuchs, so the reason is visible in code.
- `getRecommendations(typeId, brand)` passes the given brand.
- Caching: Next's fetch cache key includes request headers, and
  `x-oly-dataset` differs per brand, so Fuchs and Eurol responses for the same
  `typeId` never share a cache entry. Revalidation intervals stay unchanged.
- `sortRecommendation` also trims `productName` with `.trim()`, because Eurol
  sends trailing tabs.

### 3. Recommendations route (`src/app/api/olyslager/recommendations/[typeId]/route.ts`)

- It reads `?brand=` from the request URL.
  - When the parameter is absent, it uses `DEFAULT_BRAND`. Existing callers
    and cached URLs keep working.
  - When it is present but not a valid brand, the route returns `400 { error:
    "brand must be one of: fuchs, eurol" }`.
- Everything else stays as it is: typeId validation, the `OlyslagerApiError`
  to 4xx/502 mapping, and the rethrow of unknown errors.
- The other `/api/olyslager/*` routes stay unchanged and keep using Fuchs.

### 4. Brand preference (`src/lib/brand-preference.ts` + `src/hooks/use-brand-preference.ts`)

- `brand-preference.ts` follows the pattern of `recent-searches.ts`:
  - `const STORAGE_KEY = "apl-oil-chooser:brand";`
  - `getBrandPreference(): Brand` returns
    `parseBrand(localStorage.getItem(...)) ?? DEFAULT_BRAND`. When
    `localStorage` is undefined, as on the server, or when it throws, the
    function returns `DEFAULT_BRAND`.
  - `setBrandPreference(brand: Brand): void` writes the value and swallows
    any exception.
- The `useBrandPreference()` hook returns `[brand, setBrand]`.
  - The initial state is `DEFAULT_BRAND`. A mount effect then reads
    localStorage. This avoids a hydration mismatch, because the server always
    renders Fuchs.
  - `setBrand` updates state and persists the value.
  - A user with Eurol stored briefly sees Fuchs in the switch on first render.
    The results panel starts its fetch only after the hook has read storage,
    so it never fetches Fuchs just to discard it. The hook exposes a `ready`
    flag for this.

### 5. Results UI (`src/components/vehicle-selector/results-panel.tsx`)

- A Fuchs | Eurol segmented switch sits at the top of the results column.
  It uses the existing `Button` primitives as a two-button group, with
  `aria-pressed` on the active button.
  - Labels are brand names ("Fuchs", "Eurol") and are not translated.
  - A group label such as "Product brand" / "Марка продукти" is added to
    `en.json` and `bg.json` under `Results`.
- The fetch URL is `/api/olyslager/recommendations/${typeId}?brand=${brand}`.
  It is `null` until the brand preference is `ready`.
  - Switching brand changes the URL, and `useOlyslagerResource` refetches. The
    existing loading skeleton shows during the fetch.
  - The switch stays rendered in the loading, error and empty states, so the
    user can always switch back.
- `onLoaded` keeps firing with the loaded recommendation. Its consumer only
  uses vehicle info, and that info is the same for both brands.
- The empty state (`components.length === 0`) reuses the existing
  `noComponents` message. When the selected brand has no recommendations for
  the vehicle, the user sees that message plus the switch, not an error.

### 6. Product image fallback (`src/components/results/product-card.tsx`)

- `ProductCard` receives a `brand` prop, passed down from `ResultsPanel`
  through `ComponentAccordion` to `ProductUseSection` / `ProductGrid` to
  `ProductCard`.
- Extract a pure helper, `getFallbackImage(brand)`, into
  `src/components/results/product-image.ts`. It returns
  `/products/fuchs-no-image.jpg` for Fuchs and `/products/eurol-no-image.png`
  for Eurol. `initialImageSrc(product, brand)` moves into the same file.
- The image order stays the same: API `productImage` first, then
  `/products/${productCode}.jpg`, then the brand fallback. `onError` also
  swaps to the brand fallback.
- Switching brand replaces the grid with the loading skeleton until the new
  data arrives, so every `ProductCard` remounts and its `src` state resets.
- `eurol-no-image.png` is already in `public/products/` but is not committed
  yet. `.gitignore` only ignores `*.jpg`, so it can be committed as is. In production that
  directory is mounted from the host's `./products-photos`, so the file must be
  copied there on the server as well.

### 7. TM1

There is no code change. Clicking a product in TM1 sends its `productCode` to
`openArticleList` for both brands. This assumes TM1 can find Eurol codes such
as `E504149`, which must be checked manually in TM1.

## Error handling

| Situation | Result |
|---|---|
| Brand env var missing on server | Route throws; Next returns 500. The server log names the missing variable. |
| `?brand=xyz` | 400 from the recommendations route. |
| Olyslager 4xx/5xx for selected brand | Existing destructive alert with Retry. The switch stays visible. |
| Brand has no components for vehicle | Existing `noComponents` message. The switch stays visible. |
| localStorage unavailable or throwing | Brand defaults to Fuchs. Switching still works for the session but is not remembered. |
| Garbage stored value | `parseBrand` returns `null`, so the brand is Fuchs. |

## Testing

All tests use `node --test` with `node:assert/strict`, matching the existing
`*.test.ts` files.

- `src/lib/olyslager/brand.test.ts`: `parseBrand` accepts `"fuchs"` and
  `"eurol"`. It rejects `"Eurol"`, `""`, `null`, numbers and `"total"`.
- `src/lib/brand-preference.test.ts`: uses the fake localStorage pattern from
  `recent-searches.test.ts`. It covers these cases:
  - default with empty storage
  - the round-trip for Eurol
  - a garbage value
  - `getItem` throwing
  - `setItem` throwing
  - `localStorage` undefined
- `src/components/results/product-image.test.ts`: covers both brand
  fallbacks, the `productImage` priority, the `productCode` local path, and
  the case with no code, which falls back to the brand image.
- Manual check in the browser (dev server):
  1. Navigate to VW type `73434`. Fuchs products show with the Fuchs
     placeholder.
  2. Switch to Eurol. The vehicle stays selected, Eurol products load and show
     the Eurol placeholder.
  3. Reload. Eurol is still selected.
  4. Hit `/api/olyslager/recommendations/73434` with no brand, which returns
     Fuchs. Hit `?brand=bogus`, which returns 400.
  5. Run `npm run lint` and `npm run build`. Both must be clean.

## Deployment notes

- The production `.env.local` must have all five variables before the new
  image is deployed. Until then the current production image keeps working on
  the old names.
- Copy `eurol-no-image.png` into the server's `products-photos/` directory.
