import type { Brand } from "@/lib/olyslager/brand";

// TM1 / Next Catalogue (TecAlliance/TecDoc) embeds this app as a cross-origin
// <iframe> and listens for window.postMessage calls on the parent. postMessage
// takes exactly one target origin (protocol + host, no path), so we resolve the
// actual parent origin and only post if it is in this allowlist.
export const TM1_ORIGINS = [
  "https://tm1.carparts-cat.com",
  "https://tm-next.dvse.de",
] as const;

// TM1's SearchFilters bit flags (from its bundle): 1 = SupplierArticleNo, shown
// in TM1's own search UI as "Manufacturer Part Number". Eurol codes (e.g.
// E100016) are also other manufacturers' part numbers, so an unfiltered search
// buries the Eurol article; filtering by part number fixes that. Fuchs codes
// (CP…) only match as TM1 utility numbers and filtering by those (4) finds
// nothing, so Fuchs is sent without a filter — TM1's default works for it.
// Never 15: that's 1|2|4|8 and TM1 returns an unfiltered result for it.
const SEARCH_FILTER_BY_BRAND: Record<Brand, number | undefined> = {
  fuchs: undefined,
  eurol: 1,
};

export function buildOpenArticleListMessage(productCode: string, brand: Brand): string {
  const searchFilter = SEARCH_FILTER_BY_BRAND[brand];
  return JSON.stringify({
    openArticleList: {
      direct: searchFilter === undefined ? { query: productCode } : { query: productCode, searchFilter },
      inModal: true,
      useNewModal: true,
    },
  });
}

export function isEmbeddedInIframe(): boolean {
  if (typeof window === "undefined") return false;
  return window.self !== window.top;
}

function getParentOrigin(): string | null {
  // Chrome/Safari: exact ancestor origin.
  const ancestor = window.location.ancestorOrigins?.[0];
  if (ancestor) return ancestor;
  // Firefox fallback: referrer of the iframe document.
  try {
    return document.referrer ? new URL(document.referrer).origin : null;
  } catch {
    return null;
  }
}

export function openArticleList(productCode: string, brand: Brand): void {
  const origin = getParentOrigin();
  if (!origin || !(TM1_ORIGINS as readonly string[]).includes(origin)) return;
  window.parent.postMessage(buildOpenArticleListMessage(productCode, brand), origin);
}
