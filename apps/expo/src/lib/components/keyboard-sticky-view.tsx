import type { ReactNode } from "react";
import type { KeyboardStickyViewProps } from "react-native-keyboard-controller";
import { Platform } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppKeyboardStickyViewProps extends Omit<
  KeyboardStickyViewProps,
  "offset"
> {
  className?: string;
  children: ReactNode;
}

export function AppKeyboardStickyView({
  children,
  className,
  ...props
}: AppKeyboardStickyViewProps) {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <KeyboardStickyView
      offset={{
        opened: Platform.OS === "android" ? safeAreaInsets.bottom : 0,
        closed: 0,
      }}
      className={className}
      {...props}
    >
      {children}
    </KeyboardStickyView>
  );
}
