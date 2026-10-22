import type React from "react";
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

// Gesture Handler 3 doesn't cancel the row's React Native press once a swipe starts, so lifting the finger would also count as a tap.
export const useSwipePressGuard = () => {
  const dragged = useRef(false);

  return {
    onSwipeableOpenStartDrag: () => {
      dragged.current = true;
    },
    pressHandlers: (onPress: () => void) => ({
      onPressIn: () => {
        dragged.current = false;
      },
      onPress: () => {
        if (!dragged.current) onPress();
      },
    }),
  };
};

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
    renderLeftActions: leftAction ? renderLeftActions : undefined,
    renderRightActions: rightAction ? renderRightActions : undefined,
  };
};
