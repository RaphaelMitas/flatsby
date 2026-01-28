import * as React from "react";

import type { Breakpoint } from "@flatsby/validators/breakpoints";
import { BREAKPOINTS } from "@flatsby/validators/breakpoints";

export function useMediaQuery(breakpoint: Breakpoint) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const query = `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return matches;
}
