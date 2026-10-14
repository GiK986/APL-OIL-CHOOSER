import type { Brand } from "@/lib/olyslager/brand";

// TM1 / Next Catalogue (TecAlliance/TecDoc) embeds this app as a cross-origin
// <iframe> and listens for window.postMessage calls on the parent. postMessage
// takes exactly one target origin (protocol + host, no path), so we resolve the
// actual parent origin and only post if it is in this allowlist.
export const TM1_ORIGINS = [
  "https://tm1.carparts-cat.com",
  "https://tm-next.dvse.de",
] as const;

// TM1's SearchFilters bit flags (from its bundle). An unfiltered search matches
// every number type (OE, trade, EAN...), so the clicked product isn't the
// first hit; each brand's codes live in a different number field:
// - Eurol (E100016…): 97 = SupplierArticleNoAndTradeReference — SupplierArticleNo
//   (1, "Manufacturer Part Number" in TM1's UI) | TradeReference_KART (32) |
//   TradeReference_KARTREF (64).
// - Fuchs (CP1003290…): 4 = UtilityNo — Auto Plus lists Fuchs CP codes as
//   utility numbers.
// Never 15: that's 1|2|4|8 and TM1 returns an unfiltered result for it.
const SEARCH_FILTER_BY_BRAND: Record<Brand, number> = {
  fuchs: 4,
  eurol: 97,
};

export function buildOpenArticleListMessage(productCode: string, brand: Brand): string {
  return JSON.stringify({
    openArticleList: {
      direct: { query: productCode, searchFilter: SEARCH_FILTER_BY_BRAND[brand] },
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
