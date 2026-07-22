"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { buildStorageKey, hasAppState, readPersistedPath, writePersistedPath } from "@/lib/route-persistence";

const ENTRY_PATH = "/";

// TM1/Next Catalogue embeds this app in an iframe at a fixed entry URL and
// recreates that iframe (discarding in-app navigation) whenever it refreshes
// its own tab. This restores the last visited route so that refresh doesn't
// bounce the user back to the start.
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
  const router = useRouter();
  const hasCheckedInitialLoad = useRef(false);
  const storageKey = useRef(buildStorageKey(null));

  // Runs once per real page load (this component lives in the root layout
  // and isn't remounted by client-side navigation) — never on a client nav.
  // This app keeps all its navigation state in query params on a single
  // route ("/"), so a bare pathname check can't distinguish "fresh entry"
  // from "deep in the flow" the way it could for a multi-route app — hence
  // hasAppState, which also treats the entry URL as fresh when it carries
  // only TM1's own lid/sid/tid params. A genuine deep link (real app state
  // already in the URL) is left untouched.
  useEffect(() => {
    if (hasCheckedInitialLoad.current) return;
    hasCheckedInitialLoad.current = true;
    storageKey.current = buildStorageKey(searchParams.get("tid"));
    if (pathname !== ENTRY_PATH || hasAppState(searchParams)) return;
    const saved = readPersistedPath(storageKey.current);
    if (saved && saved !== ENTRY_PATH) router.replace(saved);
  }, [pathname, searchParams, router]);

  // Record every navigation so the restore above has something to recover.
  useEffect(() => {
    const query = searchParams.toString();
    const current = query ? `${pathname}?${query}` : pathname;
    writePersistedPath(storageKey.current, current);
  }, [pathname, searchParams]);

  return null;
}
