import { useTranslations } from "next-intl";
import type { Capacity } from "@/lib/olyslager/types";

export function CapacitiesList({ capacities }: { capacities: Capacity[] }) {
  const t = useTranslations("Results");

  if (capacities.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("capacities")}
      </p>
      <dl className="flex flex-col gap-1 text-sm">
        {capacities.map((capacity, index) => (
          <div key={index} className="flex justify-between border-b border-border py-1 last:border-none">
            <dt className="text-muted-foreground">
              {capacity.item}
              {capacity.condition ? ` (${capacity.condition})` : ""}
            </dt>
            <dd className="font-medium">
              {capacity.value} {capacity.unit}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
