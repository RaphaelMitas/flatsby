import type { ComponentProps } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "~/lib/utils";
import { useRefreshControl } from "./pull-to-refresh";

type AppScrollViewProps = ComponentProps<typeof KeyboardAwareScrollView> & {
  onRefresh?: () => Promise<unknown>;
};

export function AppScrollView({
  children,
  className,
  contentContainerClassName,
  onRefresh,
  ...props
}: AppScrollViewProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const refreshControl = useRefreshControl(onRefresh);

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      className={cn("flex-1", className)}
      bottomOffset={safeAreaInsets.bottom}
      contentContainerClassName={cn("grow", contentContainerClassName)}
      refreshControl={refreshControl}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
