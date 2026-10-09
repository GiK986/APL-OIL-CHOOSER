"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_BRAND, type Brand } from "@/lib/olyslager/brand";
import { getBrandPreference, setBrandPreference } from "@/lib/brand-preference";

interface UseBrandPreferenceResult {
  brand: Brand;
  setBrand: (brand: Brand) => void;
  /** False until the stored preference has been read; callers should hold off fetching until then. */
  ready: boolean;
}

export function useBrandPreference(): UseBrandPreferenceResult {
  // The server can't see localStorage, so the first render is always the
  // default; the stored value is applied on mount to avoid a hydration mismatch.
  const [state, setState] = useState<{ brand: Brand; ready: boolean }>({
    brand: DEFAULT_BRAND,
    ready: false,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local state from localStorage once on mount, same pattern as useRecentSearches
    setState({ brand: getBrandPreference(), ready: true });
  }, []);

  const setBrand = useCallback((brand: Brand) => {
    setState({ brand, ready: true });
    setBrandPreference(brand);
  }, []);

  return { brand: state.brand, setBrand, ready: state.ready };
}
