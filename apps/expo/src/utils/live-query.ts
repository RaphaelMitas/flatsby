import type { MutationKey } from "@tanstack/react-query";
import { useIsFocused } from "expo-router";
import { useIsMutating } from "@tanstack/react-query";

import { queryClient } from "./api";

const isMutating = (mutationKey: MutationKey) =>
  queryClient.isMutating({ mutationKey }) > 0;

// A refetch landing mid-write would wipe its optimistic patch
export const holdWhileMutating = (mutationKey: MutationKey) => () =>
  isMutating(mutationKey) ? Number.POSITIVE_INFINITY : 0;

/** Polls while the screen is focused and none of its writes are in flight. */
export function useLivePolling(mutationKey: MutationKey) {
  const isFocused = useIsFocused();
  // TanStack reads refetchInterval only when it reschedules, so a settled write has to re-render
  useIsMutating({ mutationKey });
  return (interval: number) => () =>
    isFocused && !isMutating(mutationKey) ? interval : false;
}
