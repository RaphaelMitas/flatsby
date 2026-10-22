import type { SharedValue } from "react-native-reanimated";
import type { ClassNameValue } from "tailwind-merge";
import { useCallback, useRef } from "react";
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

export const useSwipeActions = ({
  leftAction,
  rightAction,
}: SwipeActionsProps) => {
  // Gesture Handler 3 fires presses inside the row as a swipe ends, so ignore them until the row closes
  const swiping = useRef(false);

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
      // biome-ignore lint/complexity/noUselessFragments: ReanimatedSwipeable requires a ReactElement, null is not assignable
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
      // biome-ignore lint/complexity/noUselessFragments: ReanimatedSwipeable requires a ReactElement, null is not assignable
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
    swipeableProps: {
      renderLeftActions: leftAction ? renderLeftActions : undefined,
      renderRightActions: rightAction ? renderRightActions : undefined,
      onSwipeableOpenStartDrag: () => {
        swiping.current = true;
      },
      onSwipeableClose: () => {
        swiping.current = false;
      },
    },
    guardPress:
      <Args extends unknown[]>(onPress: (...args: Args) => void) =>
      (...args: Args) => {
        if (!swiping.current) onPress(...args);
      },
  };
};
