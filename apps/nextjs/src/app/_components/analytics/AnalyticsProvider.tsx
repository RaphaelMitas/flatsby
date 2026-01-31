"use client";

import { Suspense } from "react";

import { usePageViewTracking } from "~/hooks/use-analytics";

function PageViewTracker() {
  usePageViewTracking();
  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </>
  );
}
