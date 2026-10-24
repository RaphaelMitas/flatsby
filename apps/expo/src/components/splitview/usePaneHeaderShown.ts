import { Platform } from "react-native";

import { useMediaQuery } from "./useMediaQuery";

// iPad floats its tab bar over the top bar area, and a pane-wide header can't
// make room for it, so a split pane goes without headers there.
export function usePaneHeaderShown(): boolean {
  const isLargeScreen = useMediaQuery("md");
  return !(Platform.OS === "ios" && Platform.isPad && isLargeScreen);
}
