// TM1 / Next Catalogue (TecAlliance/TecDoc) embeds this app as a cross-origin
// <iframe> and listens for window.postMessage calls on the parent. postMessage
// takes exactly one target origin (protocol + host, no path), so we resolve the
// actual parent origin and only post if it is in this allowlist.
export const TM1_ORIGINS = [
  "https://tm1.carparts-cat.com",
  "https://tm-next.dvse.de",
] as const;

export function buildOpenArticleListMessage(productCode: string): string {
  return JSON.stringify({
    openArticleList: {
      direct: { query: productCode },
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
