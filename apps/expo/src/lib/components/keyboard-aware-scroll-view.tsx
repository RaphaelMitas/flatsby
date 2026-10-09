import type { ComponentProps } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ListRefreshProps } from "./pull-to-refresh";
import { cn } from "~/lib/utils";
import { PullToRefresh } from "./pull-to-refresh";

type AppScrollViewProps = ComponentProps<typeof KeyboardAwareScrollView> & {
  refreshing?: boolean;
  onRefresh?: () => Promise<unknown>;
};

export function AppScrollView({
  children,
  className,
  contentContainerClassName,
  refreshing = false,
  onRefresh,
  ...props
}: AppScrollViewProps) {
  const safeAreaInsets = useSafeAreaInsets();

  const renderScrollView = (refreshProps: ListRefreshProps = {}) => (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      className={cn("flex-1", className)}
      bottomOffset={safeAreaInsets.bottom}
      contentContainerClassName={cn("grow", contentContainerClassName)}
      {...props}
      {...refreshProps}
    >
      {children}
    </KeyboardAwareScrollView>
  );

  if (!onRefresh) {
    return renderScrollView();
  }

  return (
    <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
      {renderScrollView}
    </PullToRefresh>
  );
}
