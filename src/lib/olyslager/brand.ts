// Product brands we have a licensed Olyslager dataset for. Vehicle navigation
// always runs against Fuchs; only recommendations follow the selected brand.
export const BRANDS = ["fuchs", "eurol"] as const;

export type Brand = (typeof BRANDS)[number];

export const DEFAULT_BRAND: Brand = "fuchs";

export function parseBrand(value: unknown): Brand | null {
  return typeof value === "string" && (BRANDS as readonly string[]).includes(value)
    ? (value as Brand)
    : null;
}
