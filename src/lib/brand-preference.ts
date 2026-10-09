import { DEFAULT_BRAND, parseBrand, type Brand } from "./olyslager/brand.ts";

export const BRAND_STORAGE_KEY = "apl-oil-chooser:brand";

export function getBrandPreference(): Brand {
  if (typeof localStorage === "undefined") return DEFAULT_BRAND;

  try {
    return parseBrand(localStorage.getItem(BRAND_STORAGE_KEY)) ?? DEFAULT_BRAND;
  } catch {
    return DEFAULT_BRAND;
  }
}

export function setBrandPreference(brand: Brand): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(BRAND_STORAGE_KEY, brand);
  } catch {
    // localStorage can throw (quota exceeded, private-browsing restrictions) —
    // the switch still works for this session, it just isn't remembered.
  }
}
