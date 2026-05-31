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
  const safeAreaInsets = useSafeAreaInsets();

  const keyboardOffset =
    Platform.OS === "ios" && !Platform.isPad ? tabBarHeight : 0;

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
