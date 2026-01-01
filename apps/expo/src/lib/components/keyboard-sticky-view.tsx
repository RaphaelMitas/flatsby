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
}

export function AppKeyboardStickyView({
  children,
  className,
  ...props
}: AppKeyboardStickyViewProps) {
  const tabbarHeight = useBottomTabBarHeight();
  const safeAreaInsets = useSafeAreaInsets();
  return (
    <KeyboardStickyView
      offset={{
        opened: Platform.OS === "ios" ? tabbarHeight : safeAreaInsets.bottom,
        closed: 0,
      }}
      className={className}
      {...props}
    >
      {children}
    </KeyboardStickyView>
  );
}
