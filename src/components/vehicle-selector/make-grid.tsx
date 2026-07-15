"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { matchesNameFilter } from "./name-filter";
import { FilterableStepLayout } from "./filterable-step-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Make } from "@/lib/olyslager/types";

interface MakeGridProps {
  categoryId: number;
  onSelect: (make: Make) => void;
}

export function MakeGrid({ categoryId, onSelect }: MakeGridProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerList<Make>(
    `/api/olyslager/makes?categoryId=${categoryId}`,
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
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyMakes")}</p>;
  }

  const filtered = data.filter((make) => matchesNameFilter(make.makeName, query));

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
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
            {filtered.map((make) => (
              <button
                key={make.id}
                type="button"
                onClick={() => onSelect(make)}
                className="flex flex-col items-center gap-2 rounded-[3px] border border-border bg-card px-2 py-3 text-center transition-colors hover:border-primary"
              >
                {make.imageUrlMedium ? (
                  <Image
                    src={make.imageUrlMedium}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <div className="h-10 w-10" />
                )}
                <span className="text-xs font-medium">{make.makeName}</span>
              </button>
            ))}
          </div>
        )
      }
      filters={
        <div className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-3">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="make-name-filter">
            {t("filterByName")}
          </label>
          <Input
            id="make-name-filter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("filterByName")}
          />
        </div>
      }
    />
  );
}
