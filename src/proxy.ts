import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Host site's language id -> our locale. Values come from the parent page
// when it builds the iframe src (e.g. `?lid=4`).
const LID_LOCALE_MAP: Record<string, (typeof routing.locales)[number]> = {
  "4": "en",
  "32": "bg",
};

function hasLocalePrefix(pathname: string) {
  return routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (!hasLocalePrefix(pathname)) {
    const lid = searchParams.get("lid");
    const locale = (lid && LID_LOCALE_MAP[lid]) || routing.defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
