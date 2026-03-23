import type { ComponentProps } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "~/lib/utils";

type AppScrollViewProps = ComponentProps<typeof KeyboardAwareScrollView>;

export function AppScrollView({
  children,
  className,
  contentContainerClassName,
  ...props
}: AppScrollViewProps) {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      className={cn("flex-1", className)}
      bottomOffset={safeAreaInsets.bottom}
      contentContainerClassName={cn("grow", contentContainerClassName)}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
