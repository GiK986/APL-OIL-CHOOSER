"use client";

import { useCallback, useEffect, useState } from "react";

interface UseOlyslagerResourceResult<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

/** Fetches a single resource from one of our /api/olyslager/* proxy routes. Pass `url: null` to skip fetching (e.g. id not selected yet). */
export function useOlyslagerResource<T>(url: string | null): UseOlyslagerResourceResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-dependency-change effect (React docs' own data-fetching example does the same)
    setLoading(true);
    setError(false);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return {
    data: url ? data : null,
    loading: url ? loading : false,
    error: url ? error : false,
    retry,
  };
}
