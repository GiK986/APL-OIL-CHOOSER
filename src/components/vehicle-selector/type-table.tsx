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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterableStepLayout } from "./filterable-step-layout";
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

type SortKey = "typeName" | "yearStart" | "powerHP" | "cylinderCC";

export function TypeTable({ modelId, onSelect }: TypeTableProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const { data, loading, error, retry } = useOlyslagerList<VehicleType>(
    `/api/olyslager/types?modelId=${modelId}`,
  );
  const [sortKey, setSortKey] = useState<SortKey>("typeName");
  const [sortAsc, setSortAsc] = useState(true);
  const [fuel, setFuel] = useState<string | null>(null);
  const [driveType, setDriveType] = useState<string | null>(null);
  const [powerMinInput, setPowerMinInput] = useState("");
  const [powerMaxInput, setPowerMaxInput] = useState("");

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

  function clearFilters() {
    setFuel(null);
    setDriveType(null);
    setPowerMinInput("");
    setPowerMaxInput("");
  }

  const filters: TypeFilters = {
    ...EMPTY_TYPE_FILTERS,
    fuel,
    driveType,
    powerMin: powerMinInput.trim() === "" ? null : Number(powerMinInput),
    powerMax: powerMaxInput.trim() === "" ? null : Number(powerMaxInput),
  };
  const fuelOptions = extractDistinctValues(data, "fuel");
  const driveTypeOptions = extractDistinctValues(data, "driveType");
  const filteredTypes = data.filter((type) => matchesTypeFilters(type, filters));
  const filtersActive = hasActiveTypeFilters(filters);

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
                    sortKey === "cylinderCC" ? (sortAsc ? "ascending" : "descending") : undefined
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
        )
      }
      filters={
        <div className="flex flex-col gap-3 rounded-[3px] border border-border bg-card p-3">
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
            <span className="text-xs font-medium text-muted-foreground">{t("powerColumn")}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={powerMinInput}
                onChange={(e) => setPowerMinInput(e.target.value)}
                placeholder={t("powerFromLabel")}
                aria-label={t("powerFromLabel")}
              />
              <Input
                type="number"
                inputMode="numeric"
                value={powerMaxInput}
                onChange={(e) => setPowerMaxInput(e.target.value)}
                placeholder={t("powerToLabel")}
                aria-label={t("powerToLabel")}
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
