import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/lib/olyslager/types";

export function SearchResultsList({ results }: { results: SearchResult[] }) {
  const t = useTranslations("Search");

  if (results.length === 0) {
    return <p className="mt-3 text-center text-sm text-muted-foreground">{t("noResults")}</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {results.map((result) => (
        <li key={result.typeId}>
          <Link href={`/results/${result.typeId}`}>
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
          </Link>
        </li>
      ))}
    </ul>
  );
}
