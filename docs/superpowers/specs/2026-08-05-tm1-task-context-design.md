# TM1 Route Restore — Design

> Adapted for APL-OIL-CHOOSER from a sibling project's TM1-embed design doc of the
> same name. That project is a multi-route catalog app (`catalog/[brand]/...`) with
> hand-threaded `tid` across several components and hardcoded breadcrumb `href`s —
> none of that structure exists here. This app is a single-route SPA (`/[locale]`)
> that keeps all navigation state in query params, so the actual bug shape, fix, and
> scope below are specific to this codebase. See
> `docs/superpowers/plans/2026-08-06-tm1-route-restore-gate.md` for the executed
> implementation plan; this document is the design record.

**Goal:** Fix three related bugs in how this app persists and restores the user's
last route inside a TM1 iframe tab: (1) the real TM1 entry URL was misclassified as
"already has app state" because the app didn't recognize `token` as one of TM1's own
params, silently disabling the restore feature in production; (2) the app's only
in-app-navigation function dropped `tid` from the URL after the first click,
breaking per-TM1-tab sessionStorage isolation; (3) the restore-on-mount redirect
fired from a `useEffect` after the page had already painted, causing a
grid-then-redirect flash on every TM1 tab refresh that had a saved route.

**Context:** Found while reviewing the sibling project's design doc against this
codebase and checking whether its fix applied here. It didn't apply as written —
this app has no `Breadcrumb` component, no `Tm1VinAutoRedirect`, and no other
consumer of `tid` besides route persistence — but auditing `hasAppState()` and the
app's one navigation function (`pushSelection` in
`src/components/vehicle-selector/vehicle-selector.tsx`) turned up two real,
independent bugs of the same "tid/control-param handling" family, plus the same
grid-then-redirect flash the sibling project had.

TM1's actual entry URL for this app carries exactly `lid` (locale), `tid`
(per-task-tab id), and `token` (auth for a central Traefik middleware — `sid` is
dead; auth used to be handled per-request but is no longer, and TM1 never actually
sends `sid`). `src/lib/route-persistence.ts`'s `TM1_CONTROL_PARAMS` set still had
`["lid", "sid", "tid"]`, so `hasAppState()` returned `true` for every real TM1 entry
(since `token` wasn't recognized) — meaning the restore-on-mount check exited early
on `hasAppState(searchParams)` and never ran in production, only in local dev where
no `token` is present.

Separately, `pushSelection` — the only function anywhere in this app that calls
`router.replace()` for real navigation — built its `query` object from scratch on
every call (`categoryId`/`makeId`/`modelId`/`typeId` only), dropping `tid` after the
very first user selection. `RoutePersistence`'s sessionStorage key is namespaced by
`tid` (`buildStorageKey(searchParams.get("tid"))`), so from the first click onward,
every write landed in the shared (non-namespaced) key instead — breaking isolation
between simultaneously open TM1 task tabs.

Unlike the sibling project, `tid` here is consumed in exactly one place
(`RoutePersistence`/`RouteRestoreGate`), so no `Tm1TaskProvider`/`Tm1Link` context
layer was needed — the fix is `pushSelection` forwarding `tid` directly from the
`searchParams` already in scope, at the one call site that builds URLs.

## Scope

**In:**

- `src/lib/route-persistence.ts`: `TM1_CONTROL_PARAMS` corrected to
  `["lid", "tid", "token"]` (drops the dead `sid`, adds the real `token`).
- `src/components/vehicle-selector/vehicle-selector.tsx`: `pushSelection` reads
  `tid` from `searchParams` (already in scope) and includes it in every `query`
  object it builds, so `tid` survives every in-app navigation, not just the first.
  `lid`/`token` are deliberately **not** forwarded — `token` is a one-shot boot
  credential, not meant to be replayed on every click.
- `src/components/route-persistence.tsx` (root layout, record-only): keeps only the
  "record every navigation" effect. Guards the write on `hasAppState(searchParams)`
  — content-based, not "skip the first render" — so a bare boot URL (which carries
  the one-shot `token`) is never persisted as a "last path", regardless of render
  count or React Strict Mode's double-invoked effects in dev.
- `src/components/route-restore-gate.tsx` (new, used only in `src/app/[locale]/page.tsx`):
  `RouteRestoreGate` starts in a `"checking"` state and renders `RouteRestoreSpinner`
  instead of its `children` until `decideRestore()` (see below) has resolved.
  Because this is a Client Component whose initial state is `"checking"`, the
  server-rendered HTML is already the spinner — the page's real content never
  paints before the redirect decision is made, eliminating the grid-then-redirect
  flash (including on TM1 tab-switch-and-back, which re-triggers this same flow).
  Reuses the existing `Common.loading` i18n key — no new key needed.
- `src/lib/route-persistence.ts`: `decideRestore(pathname, searchParams, saved)`, a
  pure function extracted so the one genuinely tricky piece of logic here — "is this
  saved value actually worth restoring?" — is unit-tested rather than only
  eyeballed inside a `.tsx` effect. Critically, a saved value that carries no real
  app state (e.g. `/?tid=x` — nothing but TM1's own control params) must resolve to
  `{ type: "ready" }`, never `{ type: "replace" }`: replacing to it wouldn't change
  what the next check sees, which would otherwise loop `RouteRestoreGate` on its
  spinner forever. This was caught by the final whole-branch review, not by any
  individual task review — see "Error handling / edge cases" below.

**Out:**

- No `Tm1TaskProvider`/`Tm1Link` context layer — not needed, `tid` has exactly one
  consumer here.
- No equivalent of `Tm1VinAutoRedirect` — this app has no comparable anti-repeat
  guard to fix.
- No change to how TM1 hands us `tid`/`lid`/`token` on the entry URL — still
  query-string based, still one-shot at iframe creation (see `src/proxy.ts`).
- No attempt to detect a `tid` change mid-session — TM1 keeps one live iframe
  instance per open task tab, so `tid` is stable for the life of a given iframe.

## Data flow

1. TM1 creates our iframe with `/?lid=...&token=Bearer...&tid=<WORKTASKID>`;
   `src/proxy.ts` redirects it to the locale-prefixed route, preserving all query
   params.
2. `RouteRestoreGate` (mounted only on the home page) checks
   `sessionStorage['apl-oil-chooser:last-path:<tid>']` before revealing anything.
   `decideRestore(pathname, searchParams, saved)`:
   - Already off the entry path, or the current URL already has real app state
     (e.g. a genuine deep link, or the render right after our own redirect below
     lands) → `{ type: "ready" }`, reveal `children`.
   - Entry path, no app state yet, and `saved` itself carries real app state →
     `{ type: "replace", path: saved }` → `router.replace(saved)`, stay on the
     spinner until the URL updates.
   - Otherwise (nothing saved, or the saved value has no real app state either) →
     `{ type: "ready" }`.
3. `RoutePersistence`'s record effect (root layout, fires on every navigation)
   writes `pathname+query` under `buildStorageKey(searchParams.get("tid"))` — but
   only when `hasAppState(searchParams)` is true for the *current* URL, so a bare
   boot URL or a fully-cleared selection is never written.
4. User picks a category/make/model/type → `pushSelection` forwards `tid` in the
   `query` it builds → `router.replace({ pathname: "/", query })` → the URL always
   carries `tid` for every future navigation, keeping the storage key consistent
   for the rest of the session.
5. TM1 refreshes the tab (or the user switches away and back) → new iframe instance
   → step 1 repeats with the same `tid` → `RouteRestoreGate` finds the saved path
   and restores it, spinner-first, no flash.

## Error handling / edge cases

- `tid` absent entirely (local dev, direct non-TM1 access): `buildStorageKey(null)`
  falls back to the shared, un-namespaced key — identical to today's behavior for
  this case, no regression.
- `sessionStorage` unavailable (partitioned/blocked third-party storage): existing
  try/catch-and-ignore pattern in `route-persistence.ts` is kept as-is.
- `RouteRestoreGate` finding nothing to restore: reveals `children` immediately on
  the effect's first run — no artificial delay beyond one effect tick.
- **A saved value with no real app state** (`/?tid=x` — reachable e.g. via a
  search-box jump that never resolved a category, followed by clearing the type
  chip, which calls `pushSelection` with every field `null`): before the fix, the
  gate treated *any* saved value `!== "/"` as worth restoring and replaced to it
  unconditionally — but replacing to a `tid`-only URL doesn't change what the next
  check sees, so it looped the redirect forever and `status` never left
  `"checking"`. `decideRestore` closes this by checking `hasAppState` on the
  *saved* value's own query, not just on string inequality with `"/"`. The
  record-side `hasAppState` guard (step 3 above) independently prevents such a
  value from ever being written in the first place, so this is defense in depth,
  not reliance on a single check.

## Testing

`node --test src/**/*.test.ts` covers the pure logic in `route-persistence.ts`,
including `decideRestore`'s regression case (a `tid`-only saved value must resolve
to `"ready"`, never `"replace"`). `.tsx` component/hook changes have no automated
test — this codebase has no JSX test renderer — and were verified via `tsc`/`lint`
plus a manual Playwright walkthrough: boot URL never persisted, real navigation
recorded under the tid-namespaced key (not the shared one), spinner instead of a
grid flash on simulated TM1 refresh, no indefinite spinner on a fresh session, and
independent restore per `tid` across two simultaneous tabs. `npx tsc --noEmit &&
npm run lint && node --test src/**/*.test.ts` must stay green.
