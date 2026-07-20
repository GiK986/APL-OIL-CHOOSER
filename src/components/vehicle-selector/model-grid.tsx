"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { matchesNameFilter } from "./name-filter";
import { sortByAppOrder } from "./sort-by-app-order";
import { FilterableStepLayout } from "./filterable-step-layout";
import { NameFilterInput } from "./name-filter-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Model } from "@/lib/olyslager/types";

interface ModelGridProps {
  makeId: number;
  onSelect: (model: Model) => void;
}

export function ModelGrid({ makeId, onSelect }: ModelGridProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerList<Model>(
    `/api/olyslager/models?makeId=${makeId}`,
  );
  const [query, setQuery] = useState("");

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>{tc("error")}</span>
          <Button size="sm" variant="outline" onClick={retry}>
            {tc("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyModels")}</p>;
  }

  const filtered = sortByAppOrder(data).filter((model) =>
    matchesNameFilter([model.modelName, model.code], query),
  );

  return (
    <FilterableStepLayout
      content={
        filtered.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{t("noMatches")}</p>
            <Button size="sm" variant="outline" onClick={() => setQuery("")}>
              {t("clearFilter")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {filtered.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelect(model)}
                className="flex flex-col items-center gap-2 rounded-[3px] border border-border bg-card px-3 py-4 text-center transition-colors hover:border-primary"
              >
                {model.imageUrlMedium ? (
                  <Image
                    src={model.imageUrlMedium}
                    alt=""
                    width={120}
                    height={60}
                    className="h-[60px] w-[120px] object-contain"
                  />
                ) : (
                  <div className="h-[60px] w-[120px]" />
                )}
                <span className="text-sm font-medium">
                  {model.modelName}
                  {model.code ? ` (${model.code})` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {model.yearStart}
                  {model.yearEnd ? `–${model.yearEnd}` : "+"}
                </span>
              </button>
            ))}
          </div>
        )
      }
      filters={
        <div className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-3">
          <NameFilterInput id="model-name-filter" value={query} onChange={setQuery} />
        </div>
      }
    />
  );
}
