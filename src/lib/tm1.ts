// TM1 / Next Catalogue (TecAlliance/TecDoc) embeds this app as a cross-origin
// <iframe> and listens for window.postMessage calls on the parent. postMessage
// takes exactly one target origin (protocol + host, no path), so we resolve the
// actual parent origin and only post if it is in this allowlist.
export const TM1_ORIGINS = [
  "https://tm1.carparts-cat.com",
  "https://tm-next.dvse.de",
] as const;

// TM1's SearchFilters bit flags (from its bundle): 1 = SupplierArticleNo, shown
// in TM1's own search UI as "Manufacturer Part Number". Without a filter TM1
// searches every number type (OE, trade, EAN...), so the clicked product isn't
// the first hit. Not 15: that's the OR of 1|2|4|8 (adds OE/utility/replacement
// numbers) and TM1 returns an unfiltered result for it.
const SEARCH_FILTER_MANUFACTURER_PART_NUMBER = 1;

export function buildOpenArticleListMessage(productCode: string): string {
  return JSON.stringify({
    openArticleList: {
      direct: { query: productCode, searchFilter: SEARCH_FILTER_MANUFACTURER_PART_NUMBER },
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

export function openArticleList(productCode: string): void {
  const origin = getParentOrigin();
  if (!origin || !(TM1_ORIGINS as readonly string[]).includes(origin)) return;
  window.parent.postMessage(buildOpenArticleListMessage(productCode), origin);
}
