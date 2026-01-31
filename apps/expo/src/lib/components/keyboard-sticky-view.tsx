import type { ReactNode } from "react";
import type { KeyboardStickyViewProps } from "react-native-keyboard-controller";
import { KeyboardStickyView } from "react-native-keyboard-controller";

import { useBottomInset } from "../utils";

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
  const { keyboardOffset, tabBarHeight, safeAreaInsets } = useBottomInset();

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
