import Image from "next/image";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { splitOnMatch } from "./highlight-match";
import type { SearchResult } from "@/lib/olyslager/types";

interface SearchResultsListProps {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  query?: string;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  return (
    <>
      {splitOnMatch(text, query).map((segment, index) =>
        segment.matched ? (
          <span key={index} className="font-semibold text-primary">
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </>
  );
}

export function SearchResultsList({ results, onSelect, query = "" }: SearchResultsListProps) {
  const t = useTranslations("Search");

  if (results.length === 0) {
    return <p className="mt-3 text-center text-sm text-muted-foreground">{t("noResults")}</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {results.map((result) => (
        <li key={result.typeId}>
          <button type="button" className="w-full text-left" onClick={() => onSelect(result)}>
            <Card className="flex flex-row items-center gap-3 px-4 py-3 transition-colors hover:bg-muted">
              <div className="h-16 w-24 shrink-0">
                {result.modelImageUrlMedium && (
                  <Image
                    src={result.modelImageUrlMedium}
                    alt=""
                    width={96}
                    height={64}
                    className="h-16 w-24 object-contain"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div>
                  <p className="truncate font-medium">
                    <HighlightedText text={result.make} query={query} />{" "}
                    <HighlightedText text={result.model} query={query} />
                    {result.modelCode && (
                      <>
                        {" ("}
                        <HighlightedText text={result.modelCode} query={query} />
                        {")"}
                      </>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    <HighlightedText text={result.type} query={query} />
                    {result.typeCode && (
                      <>
                        {" ("}
                        <HighlightedText text={result.typeCode} query={query} />
                        {")"}
                      </>
                    )}
                  </p>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                  {result.engineCode && (
                    <>
                      <dt className="text-muted-foreground">{t("engineCodeLabel")}</dt>
                      <dd>{result.engineCode}</dd>
                    </>
                  )}
                  {result.driveType && (
                    <>
                      <dt className="text-muted-foreground">{t("driveTypeLabel")}</dt>
                      <dd>{result.driveType}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">{t("yearOfProductionLabel")}</dt>
                  <dd>
                    {result.yearStart}
                    {result.yearEnd ? `–${result.yearEnd}` : "+"}
                  </dd>
                  {(result.powerHp || result.powerKw) && (
                    <>
                      <dt className="text-muted-foreground">{t("powerLabel")}</dt>
                      <dd>
                        {result.powerHp && `${result.powerHp} HP`}
                        {result.powerHp && result.powerKw && " / "}
                        {result.powerKw && `${result.powerKw} kW`}
                      </dd>
                    </>
                  )}
                  {result.fuel && (
                    <>
                      <dt className="text-muted-foreground">{t("fuelLabel")}</dt>
                      <dd>{result.fuel}</dd>
                    </>
                  )}
                  {result.cilinderCapacity && (
                    <>
                      <dt className="text-muted-foreground">{t("capacityLabel")}</dt>
                      <dd>{result.cilinderCapacity}</dd>
                    </>
                  )}
                </dl>
              </div>
            </Card>
          </button>
        </li>
      ))}
    </ul>
  );
}
