import type { ComponentProps } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ListRefreshProps } from "./pull-to-refresh";
import { cn } from "~/lib/utils";
import { PullToRefresh } from "./pull-to-refresh";

type AppScrollViewProps = ComponentProps<typeof KeyboardAwareScrollView> & {
  onRefresh?: () => Promise<unknown>;
};

export function AppScrollView({
  children,
  className,
  contentContainerClassName,
  onRefresh,
  ref,
  ...props
}: AppScrollViewProps) {
  const safeAreaInsets = useSafeAreaInsets();

  // Pull to refresh tracks the list through its own ref, which mustn't cut off the caller's
  const renderScrollView = ({
    ref: refreshRef,
    ...refreshProps
  }: ListRefreshProps = {}) => (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      className={cn("flex-1", className)}
      bottomOffset={safeAreaInsets.bottom}
      contentContainerClassName={cn("grow", contentContainerClassName)}
      {...props}
      {...refreshProps}
      ref={(list) => {
        refreshRef?.(list);
        if (typeof ref === "function") ref(list);
        else if (ref) ref.current = list;
      }}
    >
      {children}
    </KeyboardAwareScrollView>
  );

  if (!onRefresh) {
    return renderScrollView();
  }

  return (
    <PullToRefresh onRefresh={onRefresh}>{renderScrollView}</PullToRefresh>
  );
}
