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
