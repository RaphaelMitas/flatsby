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
      // form back down. The keyboard covers the tab bar, so give back the
      // bottom inset SafeAreaView reserves for it.
      offset={{ opened: insets.bottom, closed: 0 }}
      className={className}
      {...props}
    >
      {children}
    </KeyboardStickyView>
  );
}
