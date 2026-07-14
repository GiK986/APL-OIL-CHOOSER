"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "@/lib/olyslager/category-icons";
import { deriveStep } from "./derive-step";
import { BreadcrumbChip } from "./breadcrumb-chip";
import { CategoryGrid } from "./category-grid";
import { MakeGrid } from "./make-grid";
import { ModelGrid } from "./model-grid";
import { TypeTable } from "./type-table";
import { SearchBox } from "@/components/search/search-box";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Category, Make, Model } from "@/lib/olyslager/types";

const DEFAULT_CATEGORY_ID = 1; // Cars

export function VehicleSelector() {
  const tc = useTranslations("Common");
  const { data: categories, loading, error, retry } = useOlyslagerList<Category>(
    "/api/olyslager/categories",
  );

  const [category, setCategory] = useState<Category | null>(null);
  const [make, setMake] = useState<Make | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);

  useEffect(() => {
    if (categories && !category && !showCategoryGrid) {
      const defaultCategory =
        categories.find((c) => c.id === DEFAULT_CATEGORY_ID) ?? categories[0];
      if (defaultCategory) setCategory(defaultCategory);
    }
  }, [categories, category, showCategoryGrid]);

  function selectCategory(next: Category) {
    setCategory(next);
    setMake(null);
    setModel(null);
    setShowCategoryGrid(false);
  }
  function clearFromCategory() {
    setShowCategoryGrid(true);
    setCategory(null);
    setMake(null);
    setModel(null);
  }
  function clearFromMake() {
    setMake(null);
    setModel(null);
  }
  function clearFromModel() {
    setModel(null);
  }

  const step = deriveStep({
    hasCategory: category !== null,
    hasMake: make !== null,
    hasModel: model !== null,
    showCategoryGrid,
  });

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {category && !showCategoryGrid && (
          <BreadcrumbChip
            label={category.categoryName}
            icon={CATEGORY_ICONS[category.id] ?? DEFAULT_CATEGORY_ICON}
            onClear={clearFromCategory}
          />
        )}
        {make && (
          <BreadcrumbChip
            label={make.makeName}
            imageUrl={make.imageUrlSmall}
            onClear={clearFromMake}
          />
        )}
        {model && (
          <BreadcrumbChip
            label={model.modelName}
            imageUrl={model.imageUrlSmall}
            onClear={clearFromModel}
          />
        )}
        <div className="ml-auto w-full max-w-xs">
          <SearchBox />
        </div>
      </div>

      {step === "category" &&
        (error ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>{tc("error")}</span>
              <Button size="sm" variant="outline" onClick={retry}>
                {tc("retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : loading || !categories ? (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <CategoryGrid categories={categories} onSelect={selectCategory} />
        ))}
      {step === "make" && category && <MakeGrid categoryId={category.id} onSelect={setMake} />}
      {step === "model" && make && <ModelGrid makeId={make.id} onSelect={setModel} />}
      {step === "type" && model && <TypeTable modelId={model.id} />}
    </div>
  );
}
