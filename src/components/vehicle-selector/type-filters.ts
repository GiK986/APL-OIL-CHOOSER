import type { VehicleType } from "@/lib/olyslager/types";

export interface TypeFilters {
  fuel: string | null;
  driveType: string | null;
  powerMin: number | null;
  powerMax: number | null;
}

export const EMPTY_TYPE_FILTERS: TypeFilters = {
  fuel: null,
  driveType: null,
  powerMin: null,
  powerMax: null,
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
  if (filters.powerMin != null && (type.powerHP == null || type.powerHP < filters.powerMin)) {
    return false;
  }
  if (filters.powerMax != null && (type.powerHP == null || type.powerHP > filters.powerMax)) {
    return false;
  }
  return true;
}

export function hasActiveTypeFilters(filters: TypeFilters): boolean {
  return (
    filters.fuel != null ||
    filters.driveType != null ||
    filters.powerMin != null ||
    filters.powerMax != null
  );
}
