import type { VehicleType } from "@/lib/olyslager/types";

export interface TypeFilters {
  fuel: string | null;
  driveType: string | null;
  powerHpMin: number | null;
  powerHpMax: number | null;
  powerKwMin: number | null;
  powerKwMax: number | null;
}

export const EMPTY_TYPE_FILTERS: TypeFilters = {
  fuel: null,
  driveType: null,
  powerHpMin: null,
  powerHpMax: null,
  powerKwMin: null,
  powerKwMax: null,
};

export function extractDistinctValues(
  types: VehicleType[],
  key: "fuel" | "driveType",
): string[] {
  const values = new Set<string>();
  for (const type of types) {
    const value = type[key];
    if (value) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function matchesTypeFilters(type: VehicleType, filters: TypeFilters): boolean {
  if (filters.fuel != null && type.fuel !== filters.fuel) return false;
  if (filters.driveType != null && type.driveType !== filters.driveType) return false;
  if (
    filters.powerHpMin != null &&
    (type.powerHP == null || type.powerHP < filters.powerHpMin)
  ) {
    return false;
  }
  if (
    filters.powerHpMax != null &&
    (type.powerHP == null || type.powerHP > filters.powerHpMax)
  ) {
    return false;
  }
  if (
    filters.powerKwMin != null &&
    (type.powerKW == null || type.powerKW < filters.powerKwMin)
  ) {
    return false;
  }
  if (
    filters.powerKwMax != null &&
    (type.powerKW == null || type.powerKW > filters.powerKwMax)
  ) {
    return false;
  }
  return true;
}

export function hasActiveTypeFilters(filters: TypeFilters): boolean {
  return (
    filters.fuel != null ||
    filters.driveType != null ||
    filters.powerHpMin != null ||
    filters.powerHpMax != null ||
    filters.powerKwMin != null ||
    filters.powerKwMax != null
  );
}
