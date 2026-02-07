import { useQuery } from "@tanstack/react-query";

import { trpc } from "./api";

export function useAIConsent() {
  const { data, isLoading, refetch } = useQuery(
    trpc.user.getAIConsentStatus.queryOptions(),
  );

  return {
    hasConsent: data?.hasConsent ?? false,
    isLoading,
    refetch,
  };
}
