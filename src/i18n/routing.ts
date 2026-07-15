import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["bg", "en"],
  defaultLocale: "bg",
  // The app is embedded in an iframe whose parent site dictates the language
  // via a `lid` query param (see proxy.ts) — browser Accept-Language/cookie
  // detection would let the widget drift out of sync with the host page.
  localeDetection: false,
});
