import type { BottomSheetProps } from "@expo/ui/community/bottom-sheet";
import { Platform } from "react-native";
import { BottomSheetModal } from "@expo/ui/community/bottom-sheet";

import { useThemeColors } from "~/lib/utils";

export function SheetModal(props: BottomSheetProps) {
  const { getColor } = useThemeColors();

  return (
    <BottomSheetModal
      enablePanDownToClose
      backgroundStyle={
        Platform.OS === "android"
          ? { backgroundColor: getColor("background") }
          : undefined
      }
      {...props}
    />
  );
}
