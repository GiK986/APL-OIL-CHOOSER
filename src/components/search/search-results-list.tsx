import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/lib/olyslager/types";

interface SearchResultsListProps {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
}

export function SearchResultsList({ results, onSelect }: SearchResultsListProps) {
  const t = useTranslations("Search");

  if (results.length === 0) {
    return <p className="mt-3 text-center text-sm text-muted-foreground">{t("noResults")}</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {results.map((result) => (
        <li key={result.typeId}>
          <button type="button" className="w-full text-left" onClick={() => onSelect(result)}>
            <Card className="flex flex-row items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted">
              <div className="flex flex-col">
                <span className="font-medium">
                  {result.make} {result.model} — {result.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {result.yearStart}
                  {result.yearEnd ? `–${result.yearEnd}` : "+"} · {result.fuel}
                </span>
              </div>
              {result.driveType && <Badge variant="outline">{result.driveType}</Badge>}
            </Card>
          </button>
        </li>
      ))}
    </ul>
  );
}
