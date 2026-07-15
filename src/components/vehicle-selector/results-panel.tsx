"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useOlyslagerResource } from "@/hooks/use-olyslager-resource";
import { VehicleHeaderCard } from "@/components/results/vehicle-header-card";
import { ComponentCard } from "@/components/results/component-card";
import { FilterableStepLayout } from "./filterable-step-layout";
import { extractUseNames, filterComponentsByUseName } from "./product-use-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/lib/olyslager/types";

interface ResultsPanelProps {
  typeId: number;
  onLoaded?: (recommendation: Recommendation) => void;
}

export function ResultsPanel({ typeId, onLoaded }: ResultsPanelProps) {
  const t = useTranslations("Results");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerResource<Recommendation>(
    `/api/olyslager/recommendations/${typeId}`,
  );
  const [useName, setUseName] = useState<string | null>(null);

  useEffect(() => {
    if (data) onLoaded?.(data);
  }, [data, onLoaded]);

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
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (data.components.length === 0) {
    return (
      <div>
        <VehicleHeaderCard vehicle={data} />
        <Alert>
          <AlertDescription>{t("noComponents")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const useNameOptions = extractUseNames(data.components);
  const filteredComponents = filterComponentsByUseName(data.components, useName);

  return (
    <FilterableStepLayout
      content={
        <div>
          <VehicleHeaderCard vehicle={data} />
          {filteredComponents.map((component) => (
            <ComponentCard key={component.id} component={component} />
          ))}
        </div>
      }
      filters={
        useNameOptions.length > 1 ? (
          <div className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-3">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="results-use-filter"
            >
              {t("useFilterLabel")}
            </label>
            <select
              id="results-use-filter"
              value={useName ?? ""}
              onChange={(e) => setUseName(e.target.value === "" ? null : e.target.value)}
              className="h-8 w-full rounded-[3px] border border-input bg-transparent px-2 text-sm"
            >
              <option value="">{tc("allOption")}</option>
              {useNameOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ) : undefined
      }
    />
  );
}
