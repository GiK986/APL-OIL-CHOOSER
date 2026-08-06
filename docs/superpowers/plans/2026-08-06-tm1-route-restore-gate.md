# TM1 Route Restore Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three bugs found while reviewing the sibling project's TM1-task-context design
(`docs/superpowers/specs/2026-08-05-tm1-task-context-design.md`) against this codebase: (1)
`hasAppState()` misclassifies every real TM1 entry as "already has app state" because it
doesn't know about the `token` query param, silently disabling the restore-on-mount feature
in production; (2) the only in-app navigation function drops `tid` from the URL on every
selection, so route-persistence writes end up in the wrong (shared, non-namespaced)
sessionStorage key after the first click; (3) the restore-on-mount redirect currently fires
from a `useEffect` after the Brand-Grid-equivalent content has already painted, causing a
grid-then-redirect flash on every TM1 tab refresh that has a saved route.

**Architecture:** Split `RoutePersistence` (root layout, mounted once per real page load) into
a record-only component, and move the restore-on-mount decision into a new `RouteRestoreGate`
(client component, mounted only around the home page's content) that starts in a `"checking"`
state so the *first* client render — including the server-rendered HTML — is already the
spinner. `VehicleSelector`'s single navigation function starts forwarding `tid` on every
`router.replace` so the storage key it feeds stays namespaced by TM1 task tab. `TM1_CONTROL_PARAMS`
is updated to match TM1's actual entry params (`lid`, `tid`, `token` — `sid` is no longer sent).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `next-intl` for i18n/routing,
Tailwind v4, `lucide-react` icons, Node's built-in `node --test` + `node:assert/strict` for
pure-logic unit tests (existing project convention — no external test runner, no JSX renderer
installed).

## Global Constraints

- Full verification command (run before every commit that touches `.ts`/`.tsx`):
  `npx tsc --noEmit && npm run lint`
- Pure-logic test suite: `node --test src/**/*.test.ts` — only files with no JSX/hooks get
  automated tests, per existing convention (see `docs/superpowers/plans/2026-07-15-vehicle-selector-filters.md`).
  Component/hook `.tsx` changes in this plan have **no** automated test — `node --test` cannot
  execute JSX — and are verified via `tsc`/`lint` plus the manual walkthrough in the final task.
- TM1's real entry URL carries exactly `lid` (locale), `tid` (per-task-tab id), `token`
  (Traefik middleware auth). `sid` is dead — it was never actually sent by TM1 (auth moved to
  a central Traefik middleware) and must be removed, not just left as a harmless extra entry.
- Only `tid` gets forwarded on in-app navigation, never `lid` or `token` — confirmed by the
  user; `token` is a one-shot credential for the boot request, not meant to be replayed or
  kept live in the visible URL on every click.
- Reuse the existing `Common.loading` i18n key (`en.json`/`bg.json`, already "Loading…" /
  "Зареждане…") for the restore-gate spinner — no new i18n keys needed.
- Commit messages follow this repo's existing convention: `fix:`/`feat:` prefix, one line,
  imperative mood (see `git log --oneline`).

---

## File Structure

- `src/lib/route-persistence.ts` — **modify**: `TM1_CONTROL_PARAMS` set (drop `sid`, add `token`).
- `src/lib/route-persistence.test.ts` — **modify**: update/add `hasAppState` tests for the new set.
- `src/components/vehicle-selector/vehicle-selector.tsx` — **modify**: `pushSelection` forwards `tid`.
- `src/components/route-persistence.tsx` — **modify**: drop the restore effect entirely (moves to
  the new gate below), keep only the record effect, skip its write on the component's boot render.
- `src/components/route-restore-gate.tsx` — **new**: `RouteRestoreGate` (gates the home page's
  content behind a spinner until it's confirmed there's nothing to restore) and
  `RouteRestoreSpinner` (the spinner UI, reused as both the gate's own "checking" render and the
  Suspense `fallback` around it).
- `src/app/[locale]/page.tsx` — **modify**: wrap the existing content in `<RouteRestoreGate>`.

---

### Task 1: Fix `TM1_CONTROL_PARAMS` to match TM1's real entry params

**Files:**
- Modify: `src/lib/route-persistence.ts`
- Test: `src/lib/route-persistence.test.ts`

**Interfaces:**
- Produces: `hasAppState(searchParams: URLSearchParams): boolean` — unchanged signature, only
  its notion of "control param" changes. Consumed by `RouteRestoreGate` in Task 4.

- [ ] **Step 1: Update the failing/changed tests first**

In `src/lib/route-persistence.test.ts`, replace these two tests:

```ts
test("hasAppState is false when only TM1's own control params are present", () => {
  assert.equal(hasAppState(new URLSearchParams("lid=4&sid=abc&tid=task-1")), false);
});

test("hasAppState is true when the URL carries app state alongside TM1 params", () => {
  assert.equal(hasAppState(new URLSearchParams("lid=4&tid=task-1&categoryId=1")), true);
});
```

with:

```ts
test("hasAppState is false when only TM1's own control params are present", () => {
  assert.equal(
    hasAppState(new URLSearchParams("lid=4&tid=task-1&token=Bearer+eyJhbGciOi")),
    false,
  );
});

test("hasAppState is true when the URL carries app state alongside TM1 params", () => {
  assert.equal(
    hasAppState(new URLSearchParams("lid=4&tid=task-1&token=Bearer+eyJhbGciOi&categoryId=1")),
    true,
  );
});

test("hasAppState is true when sid is present (no longer a recognized TM1 control param)", () => {
  assert.equal(hasAppState(new URLSearchParams("lid=4&tid=task-1&sid=abc")), true);
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test src/lib/route-persistence.test.ts`
Expected: The first two tests FAIL (old `TM1_CONTROL_PARAMS` still has `sid` but not `token`,
so a `token`-only URL is misclassified as having app state, and an `sid`-only URL is
misclassified as not having app state). The third test also FAILS.

- [ ] **Step 3: Fix the source**

In `src/lib/route-persistence.ts`, replace:

```ts
// TM1 passes these on the entry URL to control locale/session/tab identity —
// none of them are this app's own navigation state (see src/proxy.ts for `lid`).
const TM1_CONTROL_PARAMS = new Set(["lid", "sid", "tid"]);
```

with:

```ts
// TM1 passes these on the entry URL to control locale/tab identity and
// middleware auth — none of them are this app's own navigation state (see
// src/proxy.ts for `lid`). `sid` is no longer sent — auth now happens
// centrally in a Traefik middleware via `token` — and is intentionally left
// out of this set.
const TM1_CONTROL_PARAMS = new Set(["lid", "tid", "token"]);
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test src/lib/route-persistence.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/route-persistence.ts src/lib/route-persistence.test.ts
git commit -m "fix: recognize token (not sid) as a TM1 control param"
```

---

### Task 2: Forward `tid` on every in-app navigation

**Files:**
- Modify: `src/components/vehicle-selector/vehicle-selector.tsx:70-78`

**Interfaces:**
- Consumes: `searchParams` (already in scope at `vehicle-selector.tsx:47`, `useSearchParams()`
  from `next/navigation`).
- No new exports — internal fix only.

**Context:** `pushSelection` is the *only* function in the app that calls `router.replace`
for real in-app navigation (confirmed — `grep -rn "router.replace\|router.push" src` shows
just this call site and the one inside `route-persistence.tsx`, which Task 3 removes). It
currently builds `query` from scratch on every call, silently dropping `tid` from the URL
after the very first click. That breaks `RoutePersistence`'s per-tab sessionStorage
namespacing (`buildStorageKey(searchParams.get("tid"))` falls back to the shared key) from
that point on, for the rest of the session.

- [ ] **Step 1: Add `tid` to the query object in `pushSelection`**

In `src/components/vehicle-selector/vehicle-selector.tsx`, replace:

```ts
  function pushSelection(next: Selection) {
    setHasInteracted(true);
    const query: Record<string, string> = {};
    if (next.categoryId != null) query.categoryId = String(next.categoryId);
    if (next.makeId != null) query.makeId = String(next.makeId);
    if (next.modelId != null) query.modelId = String(next.modelId);
    if (next.typeId != null) query.typeId = String(next.typeId);
    router.replace({ pathname: "/", query }, { scroll: false });
  }
```

with:

```ts
  function pushSelection(next: Selection) {
    setHasInteracted(true);
    const query: Record<string, string> = {};
    // Carry `tid` forward on every navigation — this is the only place that
    // builds URLs for in-app navigation, and route-persistence.tsx namespaces
    // its sessionStorage key by tid. Dropping it here would silently fall
    // back to the shared (non-per-tab) key after the first selection.
    const tid = searchParams.get("tid");
    if (tid) query.tid = tid;
    if (next.categoryId != null) query.categoryId = String(next.categoryId);
    if (next.makeId != null) query.makeId = String(next.makeId);
    if (next.modelId != null) query.modelId = String(next.modelId);
    if (next.typeId != null) query.typeId = String(next.typeId);
    router.replace({ pathname: "/", query }, { scroll: false });
  }
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors (no new imports needed — `searchParams` is already destructured at the
top of the component).

- [ ] **Step 3: Manual smoke check**

Run `npm run dev`, open `http://localhost:3000/en?lid=4&tid=manual-test-1`, pick a category.
Confirm the address bar's query string now includes `tid=manual-test-1` alongside
`categoryId=...`, instead of losing it.

- [ ] **Step 4: Commit**

```bash
git add src/components/vehicle-selector/vehicle-selector.tsx
git commit -m "fix: forward tid on every in-app navigation"
```

---

### Task 3: Strip `RoutePersistence` down to record-only, skip the boot-render write

**Files:**
- Modify: `src/components/route-persistence.tsx`

**Interfaces:**
- Consumes: `buildStorageKey(tid: string | null): string`, `writePersistedPath(key: string, path: string): void` from `src/lib/route-persistence.ts` (unchanged).
- Produces: nothing new — `hasAppState` and the restore behavior move to `RouteRestoreGate` (Task 4).
  `RoutePersistence` no longer imports `hasAppState`, `useRouter`, or defines `ENTRY_PATH`.

**Context:** This component currently does two jobs: restore-on-mount (a `router.replace` fired
from `useEffect`, after the page has already painted — the source of the grid-then-redirect
flash) and record-every-navigation. Task 4 moves the restore job to a page-scoped gate that can
withhold rendering until the decision is made. This task removes the restore job from here and
adds a boot-render skip to the remaining record job, so the raw entry URL (which now correctly
carries `token`, per Task 1) never lands in sessionStorage as a "last path" — only real in-app
navigations do.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/components/route-persistence.tsx` with:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { buildStorageKey, writePersistedPath } from "@/lib/route-persistence";

// TM1/Next Catalogue embeds this app in an iframe at a fixed entry URL and
// recreates that iframe (discarding in-app navigation) whenever it refreshes
// its own tab. This records the last visited route so RouteRestoreGate
// (src/components/route-restore-gate.tsx, mounted on the home page) can send
// the user back to it instead of bouncing them to the start.
//
// TM1 can host several of our iframes at once (one per TM1 task tab), all
// same-origin and sharing one sessionStorage bucket — so the key is
// namespaced by `tid` (TM1's task id, passed once on the entry URL, see
// src/proxy.ts for the sibling `lid` param) to stop tabs from restoring each
// other's path. Falls back to a shared key when `tid` is absent (local dev,
// direct access, or before TM1 adds it).
export function RoutePersistence() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Skips the very first write. This component lives in the root layout and
  // mounts once per real page load (never remounted by client-side nav), so
  // that first render is always the raw entry URL — which carries TM1's
  // one-shot `token` query param. Only real in-app navigations get recorded,
  // so a later restore can never replay a possibly-expired token.
  const isBootRender = useRef(true);

  useEffect(() => {
    if (isBootRender.current) {
      isBootRender.current = false;
      return;
    }
    const key = buildStorageKey(searchParams.get("tid"));
    const query = searchParams.toString();
    const current = query ? `${pathname}?${query}` : pathname;
    writePersistedPath(key, current);
  }, [pathname, searchParams]);

  return null;
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors, no unused-import warnings.

- [ ] **Step 3: Commit**

```bash
git add src/components/route-persistence.tsx
git commit -m "fix: skip persisting the raw TM1 boot URL as a last-path"
```

---

### Task 4: Create `RouteRestoreGate`

**Files:**
- Create: `src/components/route-restore-gate.tsx`

**Interfaces:**
- Consumes: `buildStorageKey(tid: string | null): string`, `hasAppState(searchParams: URLSearchParams): boolean`, `readPersistedPath(key: string): string | null` from `src/lib/route-persistence.ts`.
- Produces: `RouteRestoreGate({ children }: { children: React.ReactNode })` — client component,
  used by Task 5. `RouteRestoreSpinner()` — no props, also used directly by Task 5 as a
  `Suspense` fallback.

**Context:** `VehicleSelector` and this new gate both call `useSearchParams()`, which per
Next.js's own docs (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`)
must be wrapped in its own `<Suspense>` boundary — this project already follows that pattern
for `VehicleSelector` in `page.tsx`. `RouteRestoreSpinner` is exported separately so Task 5 can
use the *exact* same markup as both the gate's own "checking" render and the outer `Suspense`
fallback around it — there must be no visual mismatch between the two.

- [ ] **Step 1: Write the component**

Create `src/components/route-restore-gate.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { buildStorageKey, hasAppState, readPersistedPath } from "@/lib/route-persistence";

const ENTRY_PATH = "/";

// Shown while RouteRestoreGate is deciding whether there's a saved route to
// jump to, and as the Suspense fallback around the gate itself (see
// src/app/[locale]/page.tsx) — so the very first paint, before the gate's
// own client-side check has even run, already matches this instead of
// flashing blank content.
export function RouteRestoreSpinner() {
  const t = useTranslations("Common");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
    </div>
  );
}

interface RouteRestoreGateProps {
  children: React.ReactNode;
}

// Used only on the home page. TM1 recreates our iframe (discarding in-app
// navigation) whenever it refreshes its own tab or the user returns to a
// task tab; RoutePersistence (src/components/route-persistence.tsx) records
// the last real in-app path for this, namespaced by TM1's `tid`.
//
// Renders the spinner instead of `children` until it has confirmed there's
// nothing to restore, so the page content never paints before a pending
// redirect — this is what avoids the grid-then-redirect flash a post-mount
// `router.replace` would otherwise cause.
export function RouteRestoreGate({ children }: RouteRestoreGateProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    if (status !== "checking") return;

    // Either a genuine deep link (real app state already in the URL) or
    // we're past the entry path — nothing left to restore. This also covers
    // the render right after our own router.replace below lands, once the
    // URL reflects the restored state.
    if (pathname !== ENTRY_PATH || hasAppState(searchParams)) {
      setStatus("ready");
      return;
    }

    const saved = readPersistedPath(buildStorageKey(searchParams.get("tid")));
    if (saved && saved !== ENTRY_PATH) {
      router.replace(saved);
      return; // Stay on the spinner until the URL above actually updates.
    }

    setStatus("ready");
  }, [status, pathname, searchParams, router]);

  if (status === "checking") {
    return <RouteRestoreSpinner />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

- [ ] **Step 3: No automated test for this file**

`node --test` cannot execute `.tsx`/JSX — this codebase has no JSX test renderer installed
(see Global Constraints and e.g. `docs/superpowers/plans/2026-07-15-vehicle-selector-filters.md`'s
note on `FilterableStepLayout`). This component is verified via the manual walkthrough in
Task 6 after it's wired in.

- [ ] **Step 4: Commit**

```bash
git add src/components/route-restore-gate.tsx
git commit -m "feat: add RouteRestoreGate to gate the home page behind a spinner"
```

---

### Task 5: Wire `RouteRestoreGate` into the home page

**Files:**
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `RouteRestoreGate`, `RouteRestoreSpinner` from `src/components/route-restore-gate.tsx` (Task 4).

- [ ] **Step 1: Wrap the page content**

Replace the full contents of `src/app/[locale]/page.tsx` with:

```tsx
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VehicleSelector } from "@/components/vehicle-selector/vehicle-selector";
import { RouteRestoreGate, RouteRestoreSpinner } from "@/components/route-restore-gate";
import { Skeleton } from "@/components/ui/skeleton";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");

  return (
    <Suspense fallback={<RouteRestoreSpinner />}>
      <RouteRestoreGate>
        <main className="flex flex-1 flex-col items-center px-6 py-16">
          <div className="w-full max-w-3xl text-center">
            <h1 className="text-3xl font-semibold tracking-tight">{t("headline")}</h1>
            <p className="mt-3 text-muted-foreground">{t("subcopy")}</p>
          </div>
          <div className="mt-10 w-full max-w-[1320px]">
            <Suspense
              fallback={
                <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              }
            >
              <VehicleSelector />
            </Suspense>
          </div>
        </main>
      </RouteRestoreGate>
    </Suspense>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\[locale\]/page.tsx
git commit -m "feat: gate the home page behind RouteRestoreGate"
```

---

### Task 6: Full verification and manual TM1 walkthrough

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated verification**

Run: `npx tsc --noEmit && npm run lint && node --test src/**/*.test.ts`
Expected: All green.

- [ ] **Step 2: Manual check — boot URL never persisted**

Run `npm run dev`. Open `http://localhost:3000/en?lid=4&tid=manual-2&token=Bearer+fake123`
in a fresh incognito/private window (clean sessionStorage). Before clicking anything, open
DevTools → Application → Session Storage and confirm there is **no**
`apl-oil-chooser:last-path:manual-2` key yet (the boot-render write is skipped).

- [ ] **Step 3: Manual check — real navigation is recorded under the tid-namespaced key**

Still in that tab, pick a category, then a make. Confirm
`apl-oil-chooser:last-path:manual-2` now exists in Session Storage and its value is the
`/?tid=manual-2&categoryId=...&makeId=...` path (`tid` present — confirms Task 2's fix) — not
the boot URL and not a `Bearer` token.

- [ ] **Step 4: Manual check — spinner instead of flash on simulated TM1 refresh**

With the same tab still showing a make selected, reload the exact same URL
(`http://localhost:3000/en?lid=4&tid=manual-2&token=Bearer+fake123`) — this simulates TM1
recreating the iframe on tab refresh. Confirm: the spinner (`Loader2` + "Loading…"/"Зареждане…")
appears first, then the page lands directly on the previously selected category/make —
**never** a flash of the empty category grid in between.

- [ ] **Step 5: Manual check — fresh session with nothing to restore**

Open a brand-new incognito window, load `http://localhost:3000/en?lid=4&tid=manual-3&token=Bearer+fake456`.
Confirm the spinner appears only very briefly (one effect tick) before the normal category grid
renders — no indefinite spinner, no redirect loop.

- [ ] **Step 6: Manual check — multi-tab isolation**

Open two tabs with different `tid` values (`manual-4` and `manual-5`), pick different
categories in each, reload both. Confirm each tab restores its own selection, not the other
tab's (this is the bug Task 2 fixes — verify it stays fixed).

- [ ] **Step 7: Final commit if any fixups were needed during manual verification**

If steps 2–6 uncovered anything, fix it, re-run Step 1, and commit with a message describing
what the manual check caught.

---

## Self-Review

**Spec coverage:**
- `hasAppState`/`token` misclassification bug → Task 1. ✅
- `pushSelection` dropping `tid` → Task 2. ✅
- Grid-then-redirect flash / boot URL replay risk → Tasks 3–5. ✅
- `sid` removal → Task 1. ✅
- Reuse of existing `Common.loading` i18n key (no new key) → Task 4, Global Constraints. ✅
- Manual TM1 verification (per project convention, no automated iframe test harness) → Task 6. ✅

**Placeholder scan:** No TBD/"add error handling"/"similar to Task N" placeholders — every step
has full, copy-pasteable code or an exact command.

**Type consistency:** `buildStorageKey(tid: string | null): string`, `hasAppState(searchParams: URLSearchParams): boolean`,
`readPersistedPath(key: string): string | null`, `writePersistedPath(key: string, path: string): void`
are used identically (same names, same argument order) across Tasks 1, 3, and 4 — matches their
existing definitions in `src/lib/route-persistence.ts`, which this plan does not rename.
