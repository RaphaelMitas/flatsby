import { useState } from "react";
import type { ReactNode } from "react";
import type { KeyboardStickyViewProps } from "react-native-keyboard-controller";
import { Platform } from "react-native";
import { useBottomTabBarHeight } from "react-native-bottom-tabs";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppKeyboardStickyViewProps extends Omit<
  KeyboardStickyViewProps,
  "offset"
> {
  includeTabBar?: boolean;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
}

export function AppKeyboardStickyView({
  children,
  className,
  disabled = false,
  ...props
}: AppKeyboardStickyViewProps) {
  const tabBarHeight = useBottomTabBarHeight();
  const [lastNonZeroTabBarHeight, setLastNonZeroTabBarHeight] =
    useState(tabBarHeight);
  const safeAreaInsets = useSafeAreaInsets();

  if (tabBarHeight > 0 && tabBarHeight !== lastNonZeroTabBarHeight) {
    setLastNonZeroTabBarHeight(tabBarHeight);
  }

  const effectiveTabBarHeight =
    tabBarHeight > 0 ? tabBarHeight : lastNonZeroTabBarHeight;

  const keyboardOffset =
    Platform.OS === "ios" && Platform.isPad ? 0 : effectiveTabBarHeight;

  const openedOffset = disabled
    ? (effectiveTabBarHeight + safeAreaInsets.bottom) * 2
    : keyboardOffset;

  return (
    <KeyboardStickyView
      offset={{
        opened: openedOffset,
        closed: 0,
      }}
      className={className}
      {...props}
    >
      {children}
    </KeyboardStickyView>
  );
}
