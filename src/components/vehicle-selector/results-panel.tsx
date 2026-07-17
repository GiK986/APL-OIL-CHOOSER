"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useOlyslagerResource } from "@/hooks/use-olyslager-resource";
import { VehicleSidebarCard } from "@/components/results/vehicle-sidebar-card";
import { ComponentAccordion } from "@/components/results/component-accordion";
import { Accordion } from "@/components/ui/accordion";
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-64 w-full lg:w-80 lg:shrink-0" />
      </div>
    );
  }

  if (data.components.length === 0) {
    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1">
          <Alert>
            <AlertDescription>{t("noComponents")}</AlertDescription>
          </Alert>
        </div>
        <aside className="lg:w-80 lg:shrink-0">
          <VehicleSidebarCard vehicle={data} />
        </aside>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <div className="min-w-0 flex-1">
        <Accordion multiple defaultValue={[data.components[0].id]}>
          {data.components.map((component) => (
            <ComponentAccordion key={component.id} component={component} />
          ))}
        </Accordion>
      </div>
      <aside className="lg:w-80 lg:shrink-0">
        <VehicleSidebarCard vehicle={data} />
      </aside>
    </div>
  );
}
