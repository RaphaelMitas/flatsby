"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useAIConsent() {
  const trpc = useTRPC();
  const { data, isLoading, refetch } = useQuery(
    trpc.user.getAIConsentStatus.queryOptions(),
  );

  return {
    hasConsent: data?.hasConsent ?? false,
    isLoading,
    refetch,
  };
}
