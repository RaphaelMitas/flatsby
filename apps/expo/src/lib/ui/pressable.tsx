import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { PressableProps } from "react-native";
import { Pressable as GestureHandlerPressable } from "react-native-gesture-handler";
import { styled } from "nativewind";

// react-native's Pressable hit-tests against the Fabric shadow tree, which on
// Android desyncs while views animate (e.g. the keyboard opening), so onPress
// silently stops firing until a re-render. react-native-gesture-handler's
// Pressable hit-tests the native view hierarchy instead, so taps keep working.
//
// We expose react-native's Pressable type so callers (including react-hook-form
// submit handlers passed to onPress) keep their existing prop types.
type PressableComponent = ForwardRefExoticComponent<
  PressableProps & RefAttributes<unknown>
>;

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// @ts-expect-error - NativeWind styled() produces an overly complex union type
export const Pressable: PressableComponent = styled(GestureHandlerPressable, {
  className: "style",
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
