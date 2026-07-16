"use client";

import { useCallback, useEffect, useState } from "react";
import { addRecentSearch, getRecentSearches, type RecentSearchEntry } from "@/lib/recent-searches";

interface UseRecentSearchesResult {
  entries: RecentSearchEntry[];
  add: (entry: RecentSearchEntry) => void;
}

export function useRecentSearches(): UseRecentSearchesResult {
  const [entries, setEntries] = useState<RecentSearchEntry[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local state from localStorage once on mount, same pattern as the fetch-on-dependency-change effects elsewhere in this codebase
    setEntries(getRecentSearches());
  }, []);

  const add = useCallback((entry: RecentSearchEntry) => {
    setEntries(addRecentSearch(entry));
  }, []);

  return { entries, add };
}
