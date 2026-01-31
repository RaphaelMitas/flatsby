"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";

export function useAnalytics() {
  const trpc = useTRPC();
  const captureMutation = useMutation(trpc.analytics.capture.mutationOptions());

  const capture = (event: string, properties?: Record<string, unknown>) => {
    captureMutation.mutate({ event, properties });
  };

  return { capture };
}

export function usePageViewTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { capture } = useAnalytics();
  const session = useSession();
  const prevPathRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!session.data?.user) return;

    const url = pathname + (searchParams.toString() ? `?${searchParams}` : "");
    if (prevPathRef.current === url) return;
    prevPathRef.current = url;

    capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, session.data?.user, capture]);
}
