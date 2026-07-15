"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
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

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {data.map((model) => (
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
  );
}
