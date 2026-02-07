"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import { useAIConsent } from "~/hooks/use-ai-consent";
import { AIConsentScreen } from "./ai-consent-screen";

interface ChatConsentGateProps {
  children: ReactNode;
}

export function ChatConsentGate({ children }: ChatConsentGateProps) {
  const router = useRouter();
  const { hasConsent, isLoading, refetch } = useAIConsent();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <AIConsentScreen
        onConsent={() => void refetch()}
        onDecline={() => router.push("/")}
      />
    );
  }

  return <>{children}</>;
}
