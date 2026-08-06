"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { buildStorageKey, hasAppState, writePersistedPath } from "@/lib/route-persistence";

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

  useEffect(() => {
    // Only ever persist a URL that carries real in-app state. This is what
    // keeps the raw entry URL — which carries TM1's one-shot `token` query
    // param — out of sessionStorage (a bare boot URL never has app state),
    // and it holds regardless of render count or React Strict Mode's
    // double-invoked effects in dev (unlike a "skip the first render" ref
    // guard, which a double-invoke defeats). It's also what
    // RouteRestoreGate's decideRestore relies on: a persisted value is
    // always one actually worth restoring, never a "nothing yet" value that
    // would otherwise loop the gate on its spinner forever.
    if (!hasAppState(searchParams)) return;
    const key = buildStorageKey(searchParams.get("tid"));
    const query = searchParams.toString();
    const current = query ? `${pathname}?${query}` : pathname;
    writePersistedPath(key, current);
  }, [pathname, searchParams]);

  return null;
}
