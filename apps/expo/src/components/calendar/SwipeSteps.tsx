import type { ReactNode } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const ACTIVATION_DISTANCE = 16;
const STEP_DISTANCE = 60;
const FLING_VELOCITY = 500;

/** Swiping left steps forward, right steps back; vertical drags stay with the scroller inside. */
export function SwipeSteps({
  onStep,
  children,
}: {
  onStep: (delta: number) => void;
  children: ReactNode;
}) {
  const shift = useSharedValue(0);
  const swipe = Gesture.Pan()
    .activeOffsetX([-ACTIVATION_DISTANCE, ACTIVATION_DISTANCE])
    .failOffsetY([-ACTIVATION_DISTANCE, ACTIVATION_DISTANCE])
    .onUpdate(({ translationX }) => {
      shift.set(translationX / 3);
    })
    .onEnd(({ translationX, velocityX }, success) => {
      shift.set(withTiming(0, { duration: 150 }));
      if (
        success &&
        (Math.abs(translationX) > STEP_DISTANCE ||
          Math.abs(velocityX) > FLING_VELOCITY)
      )
        scheduleOnRN(onStep, translationX < 0 ? 1 : -1);
    });
  const shiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.get() }],
  }));

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View style={shiftStyle} className="flex-1">
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
