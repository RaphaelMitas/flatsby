import type React from "react";
import type { SharedValue } from "react-native-reanimated";
import type { ClassNameValue } from "tailwind-merge";
import { useCallback } from "react";
import { Text, View } from "react-native";
import Reanimated, { useAnimatedStyle } from "react-native-reanimated";

import { cn } from "~/lib/utils";

interface SwipeAction {
  text: string;
  className?: ClassNameValue;
  textClassName?: ClassNameValue;
}

interface SwipeActionsProps {
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
}

interface SwipeActionsReturn {
  renderLeftActions?: (
    _prog: SharedValue<number>,
    _drag: SharedValue<number>,
  ) => React.ReactElement;
  renderRightActions?: (
    _prog: SharedValue<number>,
    _drag: SharedValue<number>,
  ) => React.ReactElement;
}

export const useSwipeActions = ({
  leftAction,
  rightAction,
}: SwipeActionsProps): SwipeActionsReturn => {
  const rightActionStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      flexDirection: "row",
    };
  });

  const leftActionStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      flexDirection: "row",
    };
  });

  const renderRightActions = useCallback(
    (_prog: SharedValue<number>, _drag: SharedValue<number>) => {
      if (!rightAction) return <></>;

      return (
        <Reanimated.View style={rightActionStyle}>
          <View
            className={cn(
              "h-full w-full items-end justify-center rounded-lg p-4",
              rightAction.className,
            )}
          >
            <Text
              className={cn("text-sm font-medium", rightAction.textClassName)}
            >
              {rightAction.text}
            </Text>
          </View>
        </Reanimated.View>
      );
    },
    [rightActionStyle, rightAction],
  );

  const renderLeftActions = useCallback(
    (_prog: SharedValue<number>, _drag: SharedValue<number>) => {
      if (!leftAction) return <></>;

      return (
        <Reanimated.View style={leftActionStyle}>
          <View
            className={cn(
              "h-full w-full items-start justify-center rounded-lg p-4",
              leftAction.className,
            )}
          >
            <Text
              className={cn("text-sm font-medium", leftAction.textClassName)}
            >
              {leftAction.text}
            </Text>
          </View>
        </Reanimated.View>
      );
    },
    [leftActionStyle, leftAction],
  );

  return {
    renderLeftActions: leftAction ? renderLeftActions : undefined,
    renderRightActions: rightAction ? renderRightActions : undefined,
  };
};
