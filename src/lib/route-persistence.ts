const STORAGE_KEY = "apl-oil-chooser:last-path";

// TM1 passes these on the entry URL to control locale/session/tab identity —
// none of them are this app's own navigation state (see src/proxy.ts for `lid`).
const TM1_CONTROL_PARAMS = new Set(["lid", "sid", "tid"]);

export function buildStorageKey(tid: string | null): string {
  return tid ? `${STORAGE_KEY}:${tid}` : STORAGE_KEY;
}

export function hasAppState(searchParams: URLSearchParams): boolean {
  for (const key of searchParams.keys()) {
    if (!TM1_CONTROL_PARAMS.has(key)) return true;
  }
  return false;
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
