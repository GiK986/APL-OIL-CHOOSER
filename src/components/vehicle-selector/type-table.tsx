"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import type { VehicleType } from "@/lib/olyslager/types";

interface TypeTableProps {
  modelId: number;
}

type SortKey = "typeName" | "yearStart" | "powerHP" | "cylinderCC";

export function TypeTable({ modelId }: TypeTableProps) {
  const t = useTranslations("VehiclePicker");
  const tc = useTranslations("Common");
  const router = useRouter();
  const { data, loading, error, retry } = useOlyslagerList<VehicleType>(
    `/api/olyslager/types?modelId=${modelId}`,
  );
  const [sortKey, setSortKey] = useState<SortKey>("typeName");
  const [sortAsc, setSortAsc] = useState(true);

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

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

  const sorted = [...data].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv)) * dir;
    }
    return ((av as number) - (bv as number)) * dir;
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="cursor-pointer" onClick={() => toggleSort("typeName")}>
            {t("typeLabel")}
          </TableHead>
          <TableHead>{t("fuelColumn")}</TableHead>
          <TableHead className="cursor-pointer" onClick={() => toggleSort("yearStart")}>
            {t("yearsColumn")}
          </TableHead>
          <TableHead className="cursor-pointer" onClick={() => toggleSort("powerHP")}>
            {t("powerColumn")}
          </TableHead>
          <TableHead className="cursor-pointer" onClick={() => toggleSort("cylinderCC")}>
            {t("capacityColumn")}
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
              <Button size="sm" onClick={() => router.push(`/results/${type.id}`)}>
                {t("viewRecommendations")}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
