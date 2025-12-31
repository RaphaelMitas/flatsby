import type { ReactNode } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { cn } from "~/lib/utils";

interface AppScrollViewProps {
  bottomOffset?: number;
  includeTabBar?: boolean;
  className?: string;
  contentContainerClassName?: string;
  children: ReactNode;
}

export function AppScrollView({
  children,
  className,
  contentContainerClassName,
}: AppScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      className={cn("flex-1", className)}
      contentContainerClassName={cn("grow", contentContainerClassName)}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
