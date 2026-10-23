import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const ACTIVATION_DISTANCE = 16;
const FLING_VELOCITY = 500;
const SETTLE = { duration: 250 };

/**
 * The previous, current and next page side by side, dragged with the finger.
 * Pages sit at fixed spots by page number, so moving on only mounts a new neighbour and never jumps the row back.
 */
export function CalendarPager({
  page,
  onStep,
  renderPage,
}: {
  page: number;
  onStep: (delta: number) => void;
  /** -1, 0 or 1 relative to the current page */
  renderPage: (offset: number) => ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const shift = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const settled = useRef({ page, width });

  useEffect(() => {
    const target = -page * width;
    // A new width only re-aims the row; a new page slides to it
    shift.set(
      settled.current.width === width ? withTiming(target, SETTLE) : target,
    );
    settled.current = { page, width };
  }, [page, width, shift]);

  const swipe = Gesture.Pan()
    .activeOffsetX([-ACTIVATION_DISTANCE, ACTIVATION_DISTANCE])
    .failOffsetY([-ACTIVATION_DISTANCE, ACTIVATION_DISTANCE])
    .onStart(() => {
      dragStart.set(shift.get());
    })
    .onUpdate(({ translationX }) => {
      shift.set(dragStart.get() + translationX);
    })
    .onEnd(({ translationX, velocityX }, success) => {
      if (
        success &&
        (Math.abs(translationX) > width / 4 ||
          Math.abs(velocityX) > FLING_VELOCITY)
      )
        scheduleOnRN(onStep, translationX < 0 ? 1 : -1);
      else shift.set(withTiming(-page * width, SETTLE));
    });
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.get() }],
  }));

  return (
    <GestureDetector gesture={swipe}>
      <View
        className="flex-1 overflow-hidden"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <Animated.View style={rowStyle} className="flex-1">
          {width > 0 &&
            [-1, 0, 1].map((offset) => (
              <View
                key={page + offset}
                className="absolute top-0 bottom-0"
                style={{ left: (page + offset) * width, width }}
                // Only the page in view is there for screen readers and tests
                accessibilityElementsHidden={offset !== 0}
                importantForAccessibility={
                  offset === 0 ? "auto" : "no-hide-descendants"
                }
              >
                {renderPage(offset)}
              </View>
            ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
