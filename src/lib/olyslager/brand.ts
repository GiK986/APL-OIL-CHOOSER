// Product brands we have an Olyslager dataset configured for.
export const BRANDS = ["fuchs", "eurol"] as const;

export type Brand = (typeof BRANDS)[number];

// Brands the user can pick and the API accepts. Fuchs is disabled since
// 2026-10-20: its Olyslager subscription key returns 401 "invalid subscription
// key". Uncomment it (and restore DEFAULT_BRAND / NAVIGATION_BRAND in
// client.ts) once the key works again.
export const ENABLED_BRANDS: readonly Brand[] = [
  // "fuchs",
  "eurol",
];

export const DEFAULT_BRAND: Brand = "eurol";

export function parseBrand(value: unknown): Brand | null {
  return typeof value === "string" && (ENABLED_BRANDS as readonly string[]).includes(value)
    ? (value as Brand)
    : null;
}
