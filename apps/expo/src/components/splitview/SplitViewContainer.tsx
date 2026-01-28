import type { ReactNode } from "react";
import { View } from "react-native";

import type { Breakpoint } from "@flatsby/validators/breakpoints";

import { cn } from "~/lib/utils";
import { useMediaQuery } from "./useMediaQuery";

interface SplitViewContainerProps {
  listContent: ReactNode;
  detailContent: ReactNode;
  hasSelection: boolean;
  breakpoint?: Breakpoint;
  listClass?: string;
  contentClass?: string;
}

export function SplitViewContainer({
  listContent,
  detailContent,
  hasSelection,
  breakpoint = "lg",
  listClass = "flex-1",
  contentClass = "flex-1",
}: SplitViewContainerProps) {
  const isLargeScreen = useMediaQuery(breakpoint);

  if (isLargeScreen) {
    return (
      <View className="flex-1 flex-row">
        <View className={cn("border-border border-r", listClass)}>
          {listContent}
        </View>
        <View className={contentClass}>{detailContent}</View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {hasSelection ? detailContent : listContent}
    </View>
  );
}
