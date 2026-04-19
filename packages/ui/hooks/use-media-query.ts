import type { Breakpoint } from "@flatsby/validators/breakpoints";
import { useCallback, useSyncExternalStore } from "react";

import { BREAKPOINTS } from "@flatsby/validators/breakpoints";

export function useMediaQuery(breakpoint: Breakpoint) {
  const query = `(min-width: ${BREAKPOINTS[breakpoint]}px)`;

  const subscribe = useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
