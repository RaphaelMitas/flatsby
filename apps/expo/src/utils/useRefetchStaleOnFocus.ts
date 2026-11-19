import type { QueryFilters } from "@tanstack/react-query";
import { useCallback, useEffectEvent } from "react";
import { useFocusEffect } from "expo-router";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";

export const usageEvent = { reportsUsageOnly: true };

export function useRefetchStaleOnFocus(filters: QueryFilters) {
  const queryClient = useQueryClient();
  const settled =
    useIsMutating({ predicate: ({ meta }) => !meta?.reportsUsageOnly }) === 0;
  const refetchStale = useEffectEvent(
    () =>
      void queryClient.refetchQueries(
        { ...filters, stale: true, type: "active" },
        { cancelRefetch: false },
      ),
  );
  useFocusEffect(
    useCallback(() => {
      if (settled) refetchStale();
    }, [settled]),
  );
}
