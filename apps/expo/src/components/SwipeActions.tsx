import type { SharedValue } from "react-native-reanimated";
import type React from "react";
import { useCallback } from "react";
import { Text, View } from "react-native";
import Reanimated, { useAnimatedStyle } from "react-native-reanimated";

import type { ColorName } from "~/lib/utils";
import { useThemeColors } from "~/lib/utils";

interface SwipeAction {
  text: string;
  backgroundColor: ColorName;
  textColor: ColorName;
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
  const { getColor } = useThemeColors();
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
            className="h-full w-full items-end justify-center rounded-md p-4"
            style={{ backgroundColor: getColor(rightAction.backgroundColor) }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: getColor(rightAction.textColor) }}
            >
              {rightAction.text}
            </Text>
          </View>
        </Reanimated.View>
      );
    },
    [rightActionStyle, rightAction, getColor],
  );

  const renderLeftActions = useCallback(
    (_prog: SharedValue<number>, _drag: SharedValue<number>) => {
      if (!leftAction) return <></>;

      return (
        <Reanimated.View style={leftActionStyle}>
          <View
            className="h-full w-full items-start justify-center rounded-md p-4"
            style={{ backgroundColor: getColor(leftAction.backgroundColor) }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: getColor(leftAction.textColor) }}
            >
              {leftAction.text}
            </Text>
          </View>
        </Reanimated.View>
      );
    },
    [leftActionStyle, leftAction, getColor],
  );

  return {
    renderLeftActions: leftAction ? renderLeftActions : undefined,
    renderRightActions: rightAction ? renderRightActions : undefined,
  };
};
