import type { SharedValue } from "react-native-reanimated";
import type { ClassNameValue } from "tailwind-merge";
import { useRef } from "react";
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

function SwipeActionPanel({
  action,
  progress,
  align,
}: {
  action: SwipeAction;
  progress: SharedValue<number>;
  align: "start" | "end";
}) {
  // Gesture Handler 3 keeps both panels visible and paints the right one over the left
  const style = useAnimatedStyle(() => ({
    opacity: progress.get() === 0 ? 0 : 1,
  }));

  return (
    <Reanimated.View style={[{ flex: 1, flexDirection: "row" }, style]}>
      <View
        className={cn(
          "h-full w-full justify-center rounded-lg p-4",
          align === "start" ? "items-start" : "items-end",
          action.className,
        )}
      >
        <Text className={cn("text-sm font-medium", action.textClassName)}>
          {action.text}
        </Text>
      </View>
    </Reanimated.View>
  );
}

export const useSwipeActions = ({
  leftAction,
  rightAction,
}: SwipeActionsProps) => {
  // Gesture Handler 3 fires presses inside the row as a swipe ends, so ignore them until the row closes
  const swiping = useRef(false);

  const renderPanel = (
    action: SwipeAction | undefined,
    align: "start" | "end",
  ) =>
    action &&
    ((progress: SharedValue<number>) => (
      <SwipeActionPanel action={action} progress={progress} align={align} />
    ));

  return {
    swipeableProps: {
      renderLeftActions: renderPanel(leftAction, "start"),
      renderRightActions: renderPanel(rightAction, "end"),
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
