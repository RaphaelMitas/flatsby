import type { Breakpoint } from "@flatsby/validators/breakpoints";
import { useWindowDimensions } from "react-native";

import { BREAKPOINTS } from "@flatsby/validators/breakpoints";

export function useMediaQuery(breakpoint: Breakpoint): boolean {
  const { width } = useWindowDimensions();
  return width >= BREAKPOINTS[breakpoint];
}
