"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useOlyslagerResource } from "@/hooks/use-olyslager-resource";
import { VehicleHeaderCard } from "@/components/results/vehicle-header-card";
import { ComponentCard } from "@/components/results/component-card";
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

  return (
    <div>
      <VehicleHeaderCard vehicle={data} />
      {data.components.length === 0 ? (
        <Alert>
          <AlertDescription>{t("noComponents")}</AlertDescription>
        </Alert>
      ) : (
        data.components.map((component) => <ComponentCard key={component.id} component={component} />)
      )}
    </div>
  );
}
