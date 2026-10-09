"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useOlyslagerResource } from "@/hooks/use-olyslager-resource";
import { useBrandPreference } from "@/hooks/use-brand-preference";
import { VehicleSidebarCard } from "@/components/results/vehicle-sidebar-card";
import { ComponentAccordion } from "@/components/results/component-accordion";
import { BrandSwitch } from "@/components/results/brand-switch";
import { Accordion } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Brand } from "@/lib/olyslager/brand";
import type { Recommendation } from "@/lib/olyslager/types";

interface ResultsPanelProps {
  typeId: number;
  onLoaded?: (recommendation: Recommendation) => void;
}

export function ResultsPanel({ typeId, onLoaded }: ResultsPanelProps) {
  const { brand, setBrand, ready } = useBrandPreference();

  return (
    <div className="flex flex-col gap-4">
      <BrandSwitch value={brand} onChange={setBrand} />
      {/* Wait for the stored brand before fetching so a user who last chose
          Eurol doesn't trigger a throwaway Fuchs request on mount. */}
      <ResultsBody
        url={ready ? `/api/olyslager/recommendations/${typeId}?brand=${brand}` : null}
        brand={brand}
        onLoaded={onLoaded}
      />
    </div>
  );
}

function ResultsBody({
  url,
  brand,
  onLoaded,
}: {
  url: string | null;
  brand: Brand;
  onLoaded?: (recommendation: Recommendation) => void;
}) {
  const t = useTranslations("Results");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerResource<Recommendation>(url);

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
            <ComponentAccordion key={component.id} component={component} brand={brand} />
          ))}
        </Accordion>
      </div>
      <aside className="lg:w-80 lg:shrink-0">
        <VehicleSidebarCard vehicle={data} />
      </aside>
    </div>
  );
}
