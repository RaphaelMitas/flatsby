import type { ReactNode } from "react";
import type { KeyboardStickyViewProps } from "react-native-keyboard-controller";
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
  const insets = useSafeAreaInsets();

  return (
    <KeyboardStickyView
      // translateY is keyboardHeight + offset, so a positive opened pushes the
      // form back down, cancelling the bottom inset SafeAreaView reserves. The
      // tab bar hides while typing, so that inset is only the home indicator.
      offset={{ opened: insets.bottom, closed: 0 }}
      className={className}
      {...props}
    >
      {children}
    </KeyboardStickyView>
  );
}
