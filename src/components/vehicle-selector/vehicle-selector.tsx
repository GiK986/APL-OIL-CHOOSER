"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "@/lib/olyslager/category-icons";
import { deriveStep } from "./derive-step";
import { BreadcrumbChip } from "./breadcrumb-chip";
import { CategoryGrid } from "./category-grid";
import { MakeGrid } from "./make-grid";
import { ModelGrid } from "./model-grid";
import { TypeTable } from "./type-table";
import { ResultsPanel } from "./results-panel";
import { SearchBox } from "@/components/search/search-box";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import type { Category, Make, Model, VehicleType, SearchResult } from "@/lib/olyslager/types";

const DEFAULT_CATEGORY_ID = 1; // Cars

function parseId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface Selection {
  categoryId: number | null;
  makeId: number | null;
  modelId: number | null;
  typeId: number | null;
}

export function VehicleSelector() {
  const tc = useTranslations("Common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCategoryId = parseId(searchParams.get("categoryId"));
  const urlMakeId = parseId(searchParams.get("makeId"));
  const urlModelId = parseId(searchParams.get("modelId"));
  const urlTypeId = parseId(searchParams.get("typeId"));

  const { data: categories, loading, error, retry } = useOlyslagerList<Category>(
    "/api/olyslager/categories",
  );

  const [category, setCategory] = useState<Category | null>(null);
  const [make, setMake] = useState<Make | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [typeLabel, setTypeLabel] = useState<string | null>(null);
  const [showCategoryGrid, setShowCategoryGrid] = useState(false);

  // Once the user makes an explicit selection/clear, URL-hydration effects below
  // must stop resolving state from search params: right after a clear, the URL
  // hasn't caught up to the just-cleared state yet, and a resolution effect
  // reading the still-stale param would instantly restore what was just cleared.
  const [hasInteracted, setHasInteracted] = useState(false);

  function pushSelection(next: Selection) {
    setHasInteracted(true);
    const query: Record<string, string> = {};
    if (next.categoryId != null) query.categoryId = String(next.categoryId);
    if (next.makeId != null) query.makeId = String(next.makeId);
    if (next.modelId != null) query.modelId = String(next.modelId);
    if (next.typeId != null) query.typeId = String(next.typeId);
    router.replace({ pathname: "/", query }, { scroll: false });
  }

  useEffect(() => {
    if (categories && !category && !showCategoryGrid && !hasInteracted) {
      const fromUrl =
        urlCategoryId != null ? categories.find((c) => c.id === urlCategoryId) : undefined;
      const defaultCategory =
        fromUrl ?? categories.find((c) => c.id === DEFAULT_CATEGORY_ID) ?? categories[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local selection state to the fetched categories list once they arrive, same pattern as the fetch-on-dependency-change effects elsewhere in this codebase
      if (defaultCategory) setCategory(defaultCategory);
    }
  }, [categories, category, showCategoryGrid, urlCategoryId, hasInteracted]);

  const needsMakeResolution =
    !hasInteracted && urlMakeId != null && make === null && category !== null;
  const { data: resolvedMakes } = useOlyslagerList<Make>(
    needsMakeResolution ? `/api/olyslager/makes?categoryId=${category?.id}` : null,
  );
  useEffect(() => {
    if (resolvedMakes && !hasInteracted && urlMakeId != null && make === null) {
      const found = resolvedMakes.find((m) => m.id === urlMakeId);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring selection state from a deep-linked URL once the matching list has loaded
      if (found) setMake(found);
      else
        pushSelection({ categoryId: category?.id ?? null, makeId: null, modelId: null, typeId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pushSelection is stable per render and re-including it would refire this resolution effect
  }, [resolvedMakes, urlMakeId, make, category, hasInteracted]);

  const needsModelResolution =
    !hasInteracted && urlModelId != null && model === null && urlMakeId != null;
  const { data: resolvedModels } = useOlyslagerList<Model>(
    needsModelResolution ? `/api/olyslager/models?makeId=${urlMakeId}` : null,
  );
  useEffect(() => {
    if (resolvedModels && !hasInteracted && urlModelId != null && model === null) {
      const found = resolvedModels.find((m) => m.id === urlModelId);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring selection state from a deep-linked URL once the matching list has loaded
      if (found) setModel(found);
      else
        pushSelection({
          categoryId: category?.id ?? null,
          makeId: make?.id ?? urlMakeId,
          modelId: null,
          typeId: null,
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pushSelection is stable per render and re-including it would refire this resolution effect
  }, [resolvedModels, urlModelId, model, category, make, urlMakeId, hasInteracted]);

  // The type step has no intermediate list to browse (unlike make/model) — the next
  // thing that happens is ResultsPanel fetching the full recommendation, which supplies
  // the breadcrumb label via onLoaded. So hydrating typeId from the URL is a direct seed,
  // no list-matching fetch needed.
  useEffect(() => {
    if (!hasInteracted && urlTypeId != null && typeId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring selection state from a deep-linked URL
      setTypeId(urlTypeId);
    }
  }, [urlTypeId, typeId, hasInteracted]);

  function selectCategory(next: Category) {
    setCategory(next);
    setMake(null);
    setModel(null);
    setTypeId(null);
    setTypeLabel(null);
    setShowCategoryGrid(false);
    pushSelection({ categoryId: next.id, makeId: null, modelId: null, typeId: null });
  }
  function clearFromCategory() {
    setShowCategoryGrid(true);
    setCategory(null);
    setMake(null);
    setModel(null);
    setTypeId(null);
    setTypeLabel(null);
    pushSelection({ categoryId: null, makeId: null, modelId: null, typeId: null });
  }
  function selectMake(next: Make) {
    setMake(next);
    setModel(null);
    setTypeId(null);
    setTypeLabel(null);
    pushSelection({ categoryId: category?.id ?? null, makeId: next.id, modelId: null, typeId: null });
  }
  function clearFromMake() {
    setMake(null);
    setModel(null);
    setTypeId(null);
    setTypeLabel(null);
    pushSelection({ categoryId: category?.id ?? null, makeId: null, modelId: null, typeId: null });
  }
  function selectModel(next: Model) {
    setModel(next);
    setTypeId(null);
    setTypeLabel(null);
    pushSelection({
      categoryId: category?.id ?? null,
      makeId: make?.id ?? null,
      modelId: next.id,
      typeId: null,
    });
  }
  function clearFromModel() {
    setModel(null);
    setTypeId(null);
    setTypeLabel(null);
    pushSelection({
      categoryId: category?.id ?? null,
      makeId: make?.id ?? null,
      modelId: null,
      typeId: null,
    });
  }
  function selectType(next: VehicleType) {
    setTypeId(next.id);
    setTypeLabel(next.typeName);
    pushSelection({
      categoryId: category?.id ?? null,
      makeId: make?.id ?? null,
      modelId: model?.id ?? null,
      typeId: next.id,
    });
  }
  function clearFromType() {
    setTypeId(null);
    setTypeLabel(null);
    pushSelection({
      categoryId: category?.id ?? null,
      makeId: make?.id ?? null,
      modelId: model?.id ?? null,
      typeId: null,
    });
  }
  function selectSearchResult(result: SearchResult) {
    setShowCategoryGrid(false);
    setCategory(null);
    setMake(null);
    setModel(null);
    setTypeId(result.typeId);
    setTypeLabel(result.type);
    pushSelection({ categoryId: null, makeId: null, modelId: null, typeId: result.typeId });
  }

  const step = deriveStep({
    hasCategory: category !== null,
    hasMake: make !== null,
    hasModel: model !== null,
    hasType: typeId !== null,
    showCategoryGrid,
  });

  const resolvingSelection =
    !hasInteracted &&
    ((urlMakeId != null && make === null) || (urlModelId != null && model === null));

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
        {typeId != null && typeLabel && (
          <BreadcrumbChip label={typeLabel} onClear={clearFromType} />
        )}
        <div className="ml-auto w-full max-w-xs">
          <SearchBox onSelectResult={selectSearchResult} />
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
      {step !== "category" && resolvingSelection && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}
      {step === "make" && category && !resolvingSelection && (
        <MakeGrid categoryId={category.id} onSelect={selectMake} />
      )}
      {step === "model" && make && !resolvingSelection && (
        <ModelGrid makeId={make.id} onSelect={selectModel} />
      )}
      {step === "type" && model && <TypeTable modelId={model.id} onSelect={selectType} />}
      {step === "results" && typeId != null && (
        <ResultsPanel typeId={typeId} onLoaded={(rec) => setTypeLabel(rec.typeName)} />
      )}
    </div>
  );
}
