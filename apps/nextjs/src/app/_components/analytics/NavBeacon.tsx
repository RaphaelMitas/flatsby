"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { isEntryPage } from "~/utils/entry-pages";

// Module scope outlives the [locale] layout remounting, and resets on every full page load
let lastUrl: string | undefined;

function send(url: string, referrer: string | null) {
  navigator.sendBeacon("/api/pv", JSON.stringify({ url, referrer }));
}

// Chrome shows prerendered and search-prefetched pages without a request the proxy counts
function reportPrefetchedLanding() {
  const report = () => send(window.location.href, document.referrer || null);
  if ("prerendering" in document && document.prerendering === true) {
    document.addEventListener("prerenderingchange", report, { once: true });
    return;
  }
  const [navigation] = performance.getEntriesByType("navigation");
  if (
    navigation &&
    "deliveryType" in navigation &&
    navigation.deliveryType === "navigational-prefetch"
  ) {
    report();
  }
}

// The proxy skips client-side navigations, so this reports them
export function NavBeacon({
  entryPagesOnly = false,
}: {
  entryPagesOnly?: boolean;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const url = new URL(pathname, window.location.origin).href;
    if (!entryPagesOnly || isEntryPage(pathname)) {
      if (lastUrl === undefined) reportPrefetchedLanding();
      else if (lastUrl !== url) send(url, lastUrl);
    }
    lastUrl = url;
  }, [pathname, entryPagesOnly]);

  return null;
}
