import type { ComponentProps } from "react";
import { Platform } from "react-native";
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
      bottomOffset={Platform.OS === "ios" ? safeAreaInsets.bottom : 85}
      contentContainerClassName={cn("grow", contentContainerClassName)}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
