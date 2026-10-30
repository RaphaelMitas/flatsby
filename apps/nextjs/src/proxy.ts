import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { defaultLocale, localePath, locales } from "@flatsby/i18n/locale";
import {
  INVITE_REFERRER_KEY,
  inviteCodeSchema,
} from "@flatsby/validators/invite";

import { storeRedirect } from "~/app/_components/landing/content";
import { platformFor } from "~/app/_components/landing/platform";
import { isEntryPage } from "~/utils/entry-pages";
import { captureVisit } from "~/utils/page-views";

const prefix = `/${defaultLocale}`;

const startsWithSegment = (pathname: string, segment: string) =>
  pathname === segment || pathname.startsWith(`${segment}/`);

// Router fetches are NavBeacon's job; without fetch metadata only a page load asks for HTML
function isPageLoad(request: NextRequest) {
  const dest = request.headers.get("sec-fetch-dest");
  const purpose =
    request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "";
  const asksForHtml = request.headers.get("accept")?.includes("text/html");
  return (
    request.method === "GET" &&
    (dest === "document" || (dest === null && asksForHtml === true)) &&
    !purpose.includes("prefetch")
  );
}

// English marketing pages keep their unprefixed URLs and render from the [locale] segment.
export function proxy(request: NextRequest, event: NextFetchEvent) {
  const url = request.nextUrl.clone();
  const { pathname } = url;
  if (pathname.endsWith(".md")) return;

  const countVisit = (name: string, properties?: Record<string, unknown>) => {
    if (!isPageLoad(request)) return;
    const page = { url: request.url, referrer: request.headers.get("referer") };
    event.waitUntil(captureVisit(name, request.headers, page, properties));
  };

  const invite = inviteCodeSchema.safeParse(
    url.searchParams.get(INVITE_REFERRER_KEY),
  );
  const inviteCode = invite.success ? invite.data : null;
  const store = storeRedirect(pathname, inviteCode);
  if (store) {
    countVisit("store_click", {
      store: store.store,
      via_invite: inviteCode !== null,
    });
    return NextResponse.redirect(store.url, 302);
  }

  if (startsWithSegment(pathname, prefix)) {
    url.pathname = pathname.slice(prefix.length) || "/";
    return NextResponse.redirect(url, 308);
  }

  countVisit("$pageview");

  const homeLocale = locales.find(
    (locale) => localePath(locale, "/") === pathname,
  );
  // One prerendered variant per platform keeps the hero's store order without a server render
  if (homeLocale) {
    url.pathname = `/${homeLocale}/landing/${platformFor(request.headers)}`;
    return NextResponse.rewrite(url);
  }

  const rendersInPlace =
    isEntryPage(pathname) ||
    locales.some((locale) => startsWithSegment(pathname, `/${locale}`));
  if (rendersInPlace) return;

  url.pathname = `${prefix}${pathname}`;
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
    "/flatastic-alternative",
    "/pricing",
    "/faq",
    "/auth/login",
    "/join/:path+",
    "/get/ios",
    "/get/android",
  ],
};
