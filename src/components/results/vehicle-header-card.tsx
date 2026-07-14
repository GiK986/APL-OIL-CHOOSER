import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataInEnglishNote } from "./data-in-english-note";
import type { Recommendation } from "@/lib/olyslager/types";

export function VehicleHeaderCard({ vehicle }: { vehicle: Recommendation }) {
  const image = vehicle.modelImageUrlLarge ?? vehicle.makeImageUrlLarge;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center gap-4">
        {image && (
          <Image
            src={image}
            alt={vehicle.modelName}
            width={64}
            height={64}
            className="shrink-0 object-contain"
          />
        )}
        <CardTitle className="text-xl">
          {vehicle.makeName} {vehicle.modelName} — {vehicle.typeName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {vehicle.yearStart}
            {vehicle.yearEnd ? `–${vehicle.yearEnd}` : "+"}
          </Badge>
          {vehicle.fuel && <Badge variant="secondary">{vehicle.fuel}</Badge>}
          {vehicle.driveType && <Badge variant="secondary">{vehicle.driveType}</Badge>}
          {(vehicle.powerHP || vehicle.powerKW) && (
            <Badge variant="secondary">
              {vehicle.powerHP} HP / {vehicle.powerKW} kW
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <DataInEnglishNote />
        </div>
      </CardContent>
    </Card>
  );
}
