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
    setEntries(getRecentSearches());
  }, []);

  const add = useCallback((entry: RecentSearchEntry) => {
    setEntries(addRecentSearch(entry));
  }, []);

  return { entries, add };
}
