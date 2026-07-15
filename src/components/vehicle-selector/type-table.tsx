"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useOlyslagerList } from "@/hooks/use-olyslager-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterableStepLayout } from "./filterable-step-layout";
import { matchesNameFilter } from "./name-filter";
import {
  EMPTY_TYPE_FILTERS,
  extractDistinctValues,
  hasActiveTypeFilters,
  matchesTypeFilters,
  type TypeFilters,
} from "./type-filters";
import type { VehicleType } from "@/lib/olyslager/types";

interface TypeTableProps {
  modelId: number;
  onSelect: (type: VehicleType) => void;
}

type SortKey = "appOrder" | "typeName" | "yearStart" | "powerHP" | "cylinderCC";

export function TypeTable({ modelId, onSelect }: TypeTableProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerList<VehicleType>(
    `/api/olyslager/types?modelId=${modelId}`,
  );
  const [sortKey, setSortKey] = useState<SortKey>("appOrder");
  const [sortAsc, setSortAsc] = useState(true);
  const [typeNameQuery, setTypeNameQuery] = useState("");
  const [fuel, setFuel] = useState<string | null>(null);
  const [driveType, setDriveType] = useState<string | null>(null);
  const [powerHpMinInput, setPowerHpMinInput] = useState("");
  const [powerHpMaxInput, setPowerHpMaxInput] = useState("");
  const [powerKwMinInput, setPowerKwMinInput] = useState("");
  const [powerKwMaxInput, setPowerKwMaxInput] = useState("");

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
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyTypes")}</p>;
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((asc) => !asc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function sortKeyLabel(key: SortKey) {
    switch (key) {
      case "appOrder":
        return t("defaultOrderLabel");
      case "typeName":
        return t("typeLabel");
      case "yearStart":
        return t("yearsColumn");
      case "powerHP":
        return t("powerColumn");
      case "cylinderCC":
        return t("capacityColumn");
    }
  }

  function clearFilters() {
    setTypeNameQuery("");
    setFuel(null);
    setDriveType(null);
    setPowerHpMinInput("");
    setPowerHpMaxInput("");
    setPowerKwMinInput("");
    setPowerKwMaxInput("");
  }

  const filters: TypeFilters = {
    ...EMPTY_TYPE_FILTERS,
    fuel,
    driveType,
    powerHpMin: powerHpMinInput.trim() === "" ? null : Number(powerHpMinInput),
    powerHpMax: powerHpMaxInput.trim() === "" ? null : Number(powerHpMaxInput),
    powerKwMin: powerKwMinInput.trim() === "" ? null : Number(powerKwMinInput),
    powerKwMax: powerKwMaxInput.trim() === "" ? null : Number(powerKwMaxInput),
  };
  const fuelOptions = extractDistinctValues(data, "fuel");
  const driveTypeOptions = extractDistinctValues(data, "driveType");
  const filteredTypes = data.filter(
    (type) => matchesNameFilter(type.typeName, typeNameQuery) && matchesTypeFilters(type, filters),
  );
  const filtersActive = hasActiveTypeFilters(filters) || typeNameQuery.trim() !== "";

  const sorted = [...filteredTypes].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv)) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });

  return (
    <FilterableStepLayout
      content={
        sorted.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">{t("noMatches")}</p>
            <Button size="sm" variant="outline" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:hidden">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {t("sortByLabel")}
                </span>
                <Select value={sortKey} onValueChange={(value) => toggleSort(value as SortKey)}>
                  <SelectTrigger size="sm" className="w-full flex-1">
                    <SelectValue>{sortKeyLabel(sortKey)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appOrder">{t("defaultOrderLabel")}</SelectItem>
                    <SelectItem value="typeName">{t("typeLabel")}</SelectItem>
                    <SelectItem value="yearStart">{t("yearsColumn")}</SelectItem>
                    <SelectItem value="powerHP">{t("powerColumn")}</SelectItem>
                    <SelectItem value="cylinderCC">{t("capacityColumn")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={sortAsc ? tc("sortAscending") : tc("sortDescending")}
                  onClick={() => toggleSort(sortKey)}
                >
                  {sortAsc ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </Button>
              </div>
              {sorted.map((type) => (
                <div
                  key={type.id}
                  className="flex flex-col gap-2 rounded-[3px] border border-border bg-card p-3"
                >
                  <p className="text-sm font-medium">{type.typeName}</p>
                  <dl className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">{t("fuelColumn")}</dt>
                      <dd>{type.fuel ?? "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">{t("yearsColumn")}</dt>
                      <dd>
                        {type.yearStart}
                        {type.yearEnd ? `–${type.yearEnd}` : "+"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">{t("powerColumn")}</dt>
                      <dd>{type.powerHP ? `${type.powerHP} HP / ${type.powerKW} kW` : "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">{t("capacityColumn")}</dt>
                      <dd>{type.cylinderCC ? `${type.cylinderCC} ccm` : "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-muted-foreground">{t("cylindersColumn")}</dt>
                      <dd>{type.cylinderCount ?? "—"}</dd>
                    </div>
                  </dl>
                  <Button size="sm" className="w-full" onClick={() => onSelect(type)}>
                    {t("viewRecommendations")}
                  </Button>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      aria-sort={
                        sortKey === "typeName" ? (sortAsc ? "ascending" : "descending") : undefined
                      }
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => toggleSort("typeName")}
                      >
                        {t("typeLabel")}
                        {sortKey === "typeName" &&
                          (sortAsc ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead>{t("fuelColumn")}</TableHead>
                    <TableHead
                      aria-sort={
                        sortKey === "yearStart" ? (sortAsc ? "ascending" : "descending") : undefined
                      }
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => toggleSort("yearStart")}
                      >
                        {t("yearsColumn")}
                        {sortKey === "yearStart" &&
                          (sortAsc ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead
                      aria-sort={
                        sortKey === "powerHP" ? (sortAsc ? "ascending" : "descending") : undefined
                      }
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => toggleSort("powerHP")}
                      >
                        {t("powerColumn")}
                        {sortKey === "powerHP" &&
                          (sortAsc ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead
                      aria-sort={
                        sortKey === "cylinderCC"
                          ? sortAsc
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={() => toggleSort("cylinderCC")}
                      >
                        {t("capacityColumn")}
                        {sortKey === "cylinderCC" &&
                          (sortAsc ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          ))}
                      </button>
                    </TableHead>
                    <TableHead>{t("cylindersColumn")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.typeName}</TableCell>
                      <TableCell>{type.fuel ?? "—"}</TableCell>
                      <TableCell>
                        {type.yearStart}
                        {type.yearEnd ? `–${type.yearEnd}` : "+"}
                      </TableCell>
                      <TableCell>
                        {type.powerHP ? `${type.powerHP} HP / ${type.powerKW} kW` : "—"}
                      </TableCell>
                      <TableCell>{type.cylinderCC ? `${type.cylinderCC} ccm` : "—"}</TableCell>
                      <TableCell>{type.cylinderCount ?? "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => onSelect(type)}>
                          {t("viewRecommendations")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )
      }
      filters={
        <div className="flex flex-col gap-3 rounded-[3px] border border-border bg-card p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="type-name-filter">
              {t("filterByName")}
            </label>
            <Input
              id="type-name-filter"
              value={typeNameQuery}
              onChange={(e) => setTypeNameQuery(e.target.value)}
              placeholder={t("filterByName")}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="type-fuel-filter">
              {t("fuelFilterLabel")}
            </label>
            <select
              id="type-fuel-filter"
              value={fuel ?? ""}
              onChange={(e) => setFuel(e.target.value === "" ? null : e.target.value)}
              className="h-8 w-full rounded-[3px] border border-input bg-transparent px-2 text-sm"
            >
              <option value="">{tc("allOption")}</option>
              {fuelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="type-drivetype-filter"
            >
              {t("driveTypeFilterLabel")}
            </label>
            <select
              id="type-drivetype-filter"
              value={driveType ?? ""}
              onChange={(e) => setDriveType(e.target.value === "" ? null : e.target.value)}
              className="h-8 w-full rounded-[3px] border border-input bg-transparent px-2 text-sm"
            >
              <option value="">{tc("allOption")}</option>
              {driveTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("powerHpLabel")}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={powerHpMinInput}
                onChange={(e) => setPowerHpMinInput(e.target.value)}
                placeholder={t("powerFromLabel")}
                aria-label={`${t("powerHpLabel")} ${t("powerFromLabel")}`}
              />
              <Input
                type="number"
                inputMode="numeric"
                value={powerHpMaxInput}
                onChange={(e) => setPowerHpMaxInput(e.target.value)}
                placeholder={t("powerToLabel")}
                aria-label={`${t("powerHpLabel")} ${t("powerToLabel")}`}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("powerKwLabel")}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={powerKwMinInput}
                onChange={(e) => setPowerKwMinInput(e.target.value)}
                placeholder={t("powerFromLabel")}
                aria-label={`${t("powerKwLabel")} ${t("powerFromLabel")}`}
              />
              <Input
                type="number"
                inputMode="numeric"
                value={powerKwMaxInput}
                onChange={(e) => setPowerKwMaxInput(e.target.value)}
                placeholder={t("powerToLabel")}
                aria-label={`${t("powerKwLabel")} ${t("powerToLabel")}`}
              />
            </div>
          </div>
          {filtersActive && (
            <Button size="sm" variant="outline" onClick={clearFilters}>
              {t("clearFilters")}
            </Button>
          )}
        </div>
      }
    />
  );
}
