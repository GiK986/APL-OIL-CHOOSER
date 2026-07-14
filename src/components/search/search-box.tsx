"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Input } from "@/components/ui/input";
import { SearchResultsList } from "./search-results-list";
import type { SearchResponse } from "@/lib/olyslager/types";

export function SearchBox() {
  const t = useTranslations("Search");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const [results, setResults] = useState<SearchResponse["results"]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-dependency-change effect (React docs' own data-fetching example does the same)
    setLoading(true);

    fetch(`/api/olyslager/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => (res.ok ? (res.json() as Promise<SearchResponse>) : Promise.reject()))
      .then((data) => {
        if (!cancelled) setResults(data.results);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <div className="relative w-full">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("placeholder")}
      />
      {debouncedQuery && loading && (
        <p className="absolute z-10 mt-1 w-full rounded-[3px] border border-border bg-card p-3 text-center text-sm text-muted-foreground shadow-md">
          …
        </p>
      )}
      {debouncedQuery && !loading && (
        <div className="absolute z-10 mt-1 max-h-96 w-full overflow-y-auto rounded-[3px] border border-border bg-card shadow-md">
          <SearchResultsList results={results} />
        </div>
      )}
    </div>
  );
}
