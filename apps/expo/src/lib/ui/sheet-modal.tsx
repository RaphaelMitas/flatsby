import type { BottomSheetProps } from "@expo/ui/community/bottom-sheet";
import { Platform } from "react-native";
import { BottomSheetModal } from "@expo/ui/community/bottom-sheet";

import { useThemeColors } from "~/lib/utils";

export function SheetModal(props: BottomSheetProps) {
  const { getColor } = useThemeColors();

  return (
    <BottomSheetModal
      enablePanDownToClose
      // A background on iOS would replace the system Liquid Glass sheet.
      backgroundStyle={
        Platform.OS === "android"
          ? { backgroundColor: getColor("background") }
          : undefined
      }
      {...props}
    />
  );
}
