"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { buildStorageKey, decideRestore, readPersistedPath } from "@/lib/route-persistence";

// Shown while RouteRestoreGate is deciding whether there's a saved route to
// jump to, and as the Suspense fallback around the gate itself (see
// src/app/[locale]/page.tsx) — so the very first paint, before the gate's
// own client-side check has even run, already matches this instead of
// flashing blank content. role="status"/aria-live announce the wait (and
// the eventual content swap) to screen readers, since there's no visible
// focus change to cue it otherwise.
export function RouteRestoreSpinner() {
  const t = useTranslations("Common");
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16"
    >
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
// `router.replace` would otherwise cause. The actual restore/reveal decision
// is `decideRestore` (src/lib/route-persistence.ts) — a pure function so the
// tricky part of this logic is unit-tested, not just eyeballed here.
export function RouteRestoreGate({ children }: RouteRestoreGateProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    if (status !== "checking") return;

    const saved = readPersistedPath(buildStorageKey(searchParams.get("tid")));
    const decision = decideRestore(pathname, searchParams, saved);
    if (decision.type === "replace") {
      router.replace(decision.path);
      return; // Stay on the spinner until the URL above actually updates.
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-way transition out of the initial "checking" state once decideRestore has resolved
    setStatus("ready");
  }, [status, pathname, searchParams, router]);

  if (status === "checking") {
    return <RouteRestoreSpinner />;
  }

  return <>{children}</>;
}
