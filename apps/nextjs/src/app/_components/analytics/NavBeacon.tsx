"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Module scope outlives the [locale] layout remounting, and resets on every full page load
let lastUrl: string | undefined;

// Prefetched pages render from the router cache, so the proxy never sees these navigations
export function NavBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const url = new URL(pathname, window.location.origin).href;
    // Without a previous URL this is the page load the proxy already counted
    if (lastUrl !== undefined && lastUrl !== url) {
      navigator.sendBeacon(
        "/api/pv",
        JSON.stringify({ url, referrer: lastUrl }),
      );
    }
    lastUrl = url;
  }, [pathname]);

  return null;
}
