"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Category, Make, Model, VehicleType } from "@/lib/olyslager/types";

interface PickerRowProps<T> {
  label: string;
  placeholder: string;
  emptyMessage: string;
  items: T[] | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  disabled: boolean;
  value: number | null;
  onValueChange: (value: number) => void;
  getId: (item: T) => number;
  getLabel: (item: T) => string;
}

function PickerRow<T>({
  label,
  placeholder,
  emptyMessage,
  items,
  loading,
  error,
  onRetry,
  disabled,
  value,
  onValueChange,
  getId,
  getLabel,
}: PickerRowProps<T>) {
  const tc = useTranslations("Common");

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {loading ? (
        <Skeleton className="h-8 w-full" />
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{tc("error")}</span>
            <Button size="sm" variant="outline" onClick={onRetry}>
              {tc("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Select
          value={value}
          onValueChange={(next) => onValueChange(next as number)}
          disabled={disabled || !items}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder}>
              {(selected: number | null) => {
                if (selected == null) return placeholder;
                const match = items?.find((item) => getId(item) === selected);
                return match ? getLabel(match) : placeholder;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {items && items.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              items?.map((item) => (
                <SelectItem key={getId(item)} value={getId(item)}>
                  {getLabel(item)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export function VehiclePicker() {
  const t = useTranslations("VehiclePicker");
  const router = useRouter();

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [makeId, setMakeId] = useState<number | null>(null);
  const [modelId, setModelId] = useState<number | null>(null);
  const [typeId, setTypeId] = useState<number | null>(null);

  function onCategoryChange(id: number) {
    setCategoryId(id);
    setMakeId(null);
    setModelId(null);
    setTypeId(null);
  }
  function onMakeChange(id: number) {
    setMakeId(id);
    setModelId(null);
    setTypeId(null);
  }
  function onModelChange(id: number) {
    setModelId(id);
    setTypeId(null);
  }
  function onTypeChange(id: number) {
    setTypeId(id);
  }

  const categories = useOlyslagerList<Category>("/api/olyslager/categories");
  const makes = useOlyslagerList<Make>(
    categoryId ? `/api/olyslager/makes?categoryId=${categoryId}` : null,
  );
  const models = useOlyslagerList<Model>(
    makeId ? `/api/olyslager/models?makeId=${makeId}` : null,
  );
  const types = useOlyslagerList<VehicleType>(
    modelId ? `/api/olyslager/types?modelId=${modelId}` : null,
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <PickerRow
        label={t("categoryLabel")}
        placeholder={t("categoryPlaceholder")}
        emptyMessage=""
        items={categories.data}
        loading={categories.loading}
        error={categories.error}
        onRetry={categories.retry}
        disabled={false}
        value={categoryId}
        onValueChange={onCategoryChange}
        getId={(c: Category) => c.id}
        getLabel={(c: Category) => c.categoryName}
      />
      <PickerRow
        label={t("makeLabel")}
        placeholder={t("makePlaceholder")}
        emptyMessage={t("emptyMakes")}
        items={makes.data}
        loading={makes.loading}
        error={makes.error}
        onRetry={makes.retry}
        disabled={!categoryId}
        value={makeId}
        onValueChange={onMakeChange}
        getId={(m: Make) => m.id}
        getLabel={(m: Make) => m.makeName}
      />
      <PickerRow
        label={t("modelLabel")}
        placeholder={t("modelPlaceholder")}
        emptyMessage={t("emptyModels")}
        items={models.data}
        loading={models.loading}
        error={models.error}
        onRetry={models.retry}
        disabled={!makeId}
        value={modelId}
        onValueChange={onModelChange}
        getId={(m: Model) => m.id}
        getLabel={(m: Model) => m.modelName}
      />
      <PickerRow
        label={t("typeLabel")}
        placeholder={t("typePlaceholder")}
        emptyMessage={t("emptyTypes")}
        items={types.data}
        loading={types.loading}
        error={types.error}
        onRetry={types.retry}
        disabled={!modelId}
        value={typeId}
        onValueChange={onTypeChange}
        getId={(vt: VehicleType) => vt.id}
        getLabel={(vt: VehicleType) => `${vt.typeName} (${vt.yearStart}${vt.yearEnd ? `–${vt.yearEnd}` : "+"})`}
      />
      <Button disabled={!typeId} onClick={() => typeId && router.push(`/results/${typeId}`)}>
        {t("viewRecommendations")}
      </Button>
    </div>
  );
}
