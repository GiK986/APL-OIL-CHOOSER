const STORAGE_KEY = "apl-oil-chooser:last-path";

// TM1 passes these on the entry URL to control locale/tab identity and
// middleware auth — none of them are this app's own navigation state (see
// src/proxy.ts for `lid`). `sid` is no longer sent — auth now happens
// centrally in a Traefik middleware via `token` — and is intentionally left
// out of this set.
const TM1_CONTROL_PARAMS = new Set(["lid", "tid", "token"]);

export function buildStorageKey(tid: string | null): string {
  return tid ? `${STORAGE_KEY}:${tid}` : STORAGE_KEY;
}

export function hasAppState(searchParams: URLSearchParams): boolean {
  for (const key of searchParams.keys()) {
    if (!TM1_CONTROL_PARAMS.has(key)) return true;
  }
  return false;
}

export type RestoreDecision = { type: "ready" } | { type: "replace"; path: string };

// Pure decision for RouteRestoreGate (src/components/route-restore-gate.tsx):
// given the current URL and whatever was last persisted for this tid, decide
// whether to reveal the page as-is or replace to the saved path. A saved
// value that carries no real app state (e.g. "/?tid=x" — nothing but TM1's
// own control params) must never trigger a replace: replacing to it doesn't
// change what the next check sees, so the gate would loop on the spinner
// forever instead of ever reaching "ready".
export function decideRestore(
  pathname: string,
  searchParams: URLSearchParams,
  saved: string | null,
): RestoreDecision {
  if (pathname !== "/" || hasAppState(searchParams)) return { type: "ready" };
  if (saved) {
    const savedParams = new URLSearchParams(saved.split("?")[1] ?? "");
    if (hasAppState(savedParams)) return { type: "replace", path: saved };
  }
  return { type: "ready" };
}

export function readPersistedPath(key: string): string | null {
  if (typeof sessionStorage === "undefined") return null;

  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePersistedPath(key: string, path: string): void {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(key, path);
  } catch {
    // sessionStorage can throw (quota exceeded, partitioned/blocked storage in
    // a cross-origin iframe) — route persistence is a nice-to-have, never
    // worth breaking navigation over.
  }
}
