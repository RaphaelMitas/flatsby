import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { defaultLocale } from "@flatsby/i18n/locale";

const prefix = `/${defaultLocale}`;

// English marketing pages keep their unprefixed URLs and render from the [locale] segment.
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  if (pathname.endsWith(".md")) return;
  if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
    url.pathname = pathname.slice(prefix.length) || "/";
    return NextResponse.redirect(url, 308);
  }
  url.pathname = pathname === "/" ? prefix : `${prefix}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/",
    "/en/:path*",
    "/features/:path*",
    "/legal/:path*",
    "/splitwise-alternative",
    "/pricing",
    "/faq",
  ],
};
