import type { MutationKey } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useIsFocused } from "expo-router";
import { onlineManager, useIsMutating } from "@tanstack/react-query";

import { queryClient } from "./api";

// A refetch landing mid-write would wipe its optimistic patch
export const holdWhileMutating = (mutationKey: MutationKey) => () =>
  queryClient.isMutating({ mutationKey }) > 0 ? Number.POSITIVE_INFINITY : 0;

export function useLivePolling(mutationKey: MutationKey, active: boolean) {
  const isFocused = useIsFocused();
  const isMutating = useIsMutating({ mutationKey }) > 0;
  return (interval: number) =>
    active && isFocused && !isMutating ? interval : false;
}

export const useIsOnline = () =>
  useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
