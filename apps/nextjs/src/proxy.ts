import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { defaultLocale, locales } from "@flatsby/i18n/locale";

import { STORE_REDIRECTS } from "~/app/_components/landing/content";
import { captureVisit } from "~/utils/page-views";

const prefix = `/${defaultLocale}`;

const startsWithSegment = (pathname: string, segment: string) =>
  pathname === segment || pathname.startsWith(`${segment}/`);

// Client-side navigations arrive as router fetches, which NavBeacon reports instead
function isPageLoad(request: NextRequest) {
  const dest = request.headers.get("sec-fetch-dest");
  const purpose =
    request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "";
  return (
    request.method === "GET" &&
    (dest === null || dest === "document") &&
    !purpose.includes("prefetch")
  );
}

function pageOf(request: NextRequest) {
  return { url: request.url, referrer: request.headers.get("referer") };
}

// English marketing pages keep their unprefixed URLs and render from the [locale] segment.
export function proxy(request: NextRequest, event: NextFetchEvent) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  if (pathname.endsWith(".md")) return;

  const store = STORE_REDIRECTS.get(pathname);
  if (store) {
    if (isPageLoad(request)) {
      event.waitUntil(
        captureVisit("store_click", request.headers, pageOf(request), {
          store: store.store,
        }),
      );
    }
    return NextResponse.redirect(store.url, 302);
  }

  if (startsWithSegment(pathname, prefix)) {
    url.pathname = pathname.slice(prefix.length) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (isPageLoad(request)) {
    event.waitUntil(
      captureVisit("$pageview", request.headers, pageOf(request)),
    );
  }

  const rendersInPlace =
    pathname === "/auth/login" ||
    startsWithSegment(pathname, "/join") ||
    locales.some((locale) => startsWithSegment(pathname, `/${locale}`));
  if (rendersInPlace) return;

  url.pathname = pathname === "/" ? prefix : `${prefix}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/",
    "/en/:path*",
    "/de/:path*",
    "/features/:path*",
    "/legal/:path*",
    "/splitwise-alternative",
    "/pricing",
    "/faq",
    "/auth/login",
    "/join/:path*",
    "/get/:path*",
  ],
};
