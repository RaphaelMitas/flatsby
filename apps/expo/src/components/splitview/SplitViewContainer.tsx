import type { ReactNode } from "react";
import { View } from "react-native";

import type { Breakpoint } from "@flatsby/validators/breakpoints";

import { useMediaQuery } from "./useMediaQuery";

interface SplitViewContainerProps {
  listContent: ReactNode;
  detailContent: ReactNode;
  hasSelection: boolean;
  breakpoint?: Breakpoint;
}

export function SplitViewContainer({
  listContent,
  detailContent,
  hasSelection,
  breakpoint = "lg",
}: SplitViewContainerProps) {
  const isLargeScreen = useMediaQuery(breakpoint);

  if (isLargeScreen) {
    return (
      <View className="flex-1 flex-row">
        <View className="border-border flex-1 border-r">{listContent}</View>
        <View className="flex-1">{detailContent}</View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {hasSelection ? detailContent : listContent}
    </View>
  );
}
