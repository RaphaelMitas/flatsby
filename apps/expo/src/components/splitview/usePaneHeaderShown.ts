import { Platform } from "react-native";

import { useMediaQuery } from "./useMediaQuery";

export function usePaneHeaderShown(): boolean {
  const isLargeScreen = useMediaQuery("md");
  return !(Platform.OS === "ios" && Platform.isPad && isLargeScreen);
}
