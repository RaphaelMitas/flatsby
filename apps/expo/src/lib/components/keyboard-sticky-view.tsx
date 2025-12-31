import type { ReactNode } from "react";
import type { KeyboardStickyViewProps } from "react-native-keyboard-controller";
import { KeyboardStickyView } from "react-native-keyboard-controller";

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
  return (
    <KeyboardStickyView className={className} {...props}>
      {children}
    </KeyboardStickyView>
  );
}
