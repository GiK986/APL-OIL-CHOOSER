import Image from "next/image";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import type { Recommendation } from "@/lib/olyslager/types";

function formatModelYears(vehicle: Recommendation): string {
  return `${vehicle.modelYearStart}${vehicle.modelYearEnd ? `–${vehicle.modelYearEnd}` : "+"}`;
}

function formatTypeYears(vehicle: Recommendation): string {
  return `${vehicle.yearStart}${vehicle.yearEnd ? `–${vehicle.yearEnd}` : "+"}`;
}

export function VehicleSidebarCard({ vehicle }: { vehicle: Recommendation }) {
  const t = useTranslations("Results");
  const image = vehicle.modelImageUrlLarge ?? vehicle.makeImageUrlLarge;
  const makeLogo = vehicle.makeImageUrlMedium ?? vehicle.makeImageUrlSmall;
  const modelWithCode = vehicle.modelCode
    ? `${vehicle.modelName} ${vehicle.modelCode}`
    : vehicle.modelName;

  return (
    <Card className="gap-0 overflow-hidden border border-primary py-0">
      {image && (
        <Image
          src={image}
          alt={vehicle.modelName}
          width={320}
          height={200}
          className="h-auto max-h-[160px] w-full object-contain p-2"
        />
      )}
      <div className="flex items-start justify-between gap-3 border-t border-primary px-4 py-3">
        <div>
          <p className="font-bold">{vehicle.makeName}</p>
          <p className="font-bold">
            {modelWithCode} ({formatModelYears(vehicle)})
          </p>
        </div>
        {makeLogo && (
          <Image
            src={makeLogo}
            alt={vehicle.makeName}
            width={64}
            height={32}
            className="h-auto w-16 shrink-0 object-contain"
          />
        )}
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-primary px-4 py-3 text-sm">
        <span className="text-muted-foreground">{t("manufacturerLabel")}</span>
        <span className="font-bold">{vehicle.makeName}</span>
        <span className="text-muted-foreground">{t("modelLabel")}</span>
        <span className="font-bold">
          {modelWithCode} ({formatModelYears(vehicle)})
        </span>
        <span className="text-muted-foreground">{t("typeLabel")}</span>
        <span className="font-bold">{vehicle.typeName}</span>
        <span className="text-muted-foreground">{t("yearOfConstructionLabel")}</span>
        <span className="font-bold">{formatTypeYears(vehicle)}</span>
        {vehicle.fuel && (
          <>
            <span className="text-muted-foreground">{t("fuelLabel")}</span>
            <span className="font-bold">{vehicle.fuel}</span>
          </>
        )}
      </div>
    </Card>
  );
}
