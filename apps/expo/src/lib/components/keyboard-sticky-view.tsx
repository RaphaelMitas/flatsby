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
  includeTabBar = true,
  disabled = false,
  ...props
}: AppKeyboardStickyViewProps) {
  const tabBarHeight = useBottomTabBarHeight();
  const safeAreaInsets = useSafeAreaInsets();
  const isIpad = Platform.OS === "ios" && Platform.isPad;
  const isAndroidApi37OrHigher =
    Platform.OS === "android" &&
    typeof Platform.Version === "number" &&
    Platform.Version >= 37;

  const keyboardOffset =
    includeTabBar && !isIpad && !isAndroidApi37OrHigher ? tabBarHeight : 0;

  const openedOffset = disabled
    ? (tabBarHeight + safeAreaInsets.bottom) * 2
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
