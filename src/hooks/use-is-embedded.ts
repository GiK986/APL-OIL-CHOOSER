"use client";

import { useEffect, useState } from "react";
import { isEmbeddedInIframe } from "@/lib/tm1";

export function useIsEmbedded(): boolean {
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading window.self/window.top is only safe client-side, same mount-time-detection pattern as useRecentSearches reading localStorage
    setIsEmbedded(isEmbeddedInIframe());
  }, []);

  return isEmbedded;
}
