// TM1 / Next Catalogue (TecAlliance/TecDoc) embeds this app as a cross-origin
// <iframe> and listens for window.postMessage calls on the parent. This
// origin must be the exact target window origin (protocol + host, no path)
// or the browser silently drops the message.
export const TM1_ORIGIN = "https://tm1.carparts-cat.com";

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

export function openArticleList(productCode: string): void {
  window.parent.postMessage(buildOpenArticleListMessage(productCode), TM1_ORIGIN);
}
