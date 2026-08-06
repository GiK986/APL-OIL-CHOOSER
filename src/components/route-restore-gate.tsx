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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- using status guard in dependency array to ensure this effect runs exactly once
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
