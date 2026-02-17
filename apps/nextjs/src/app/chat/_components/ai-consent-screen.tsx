"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Info, Shield, ShieldOff, Sparkles, X } from "lucide-react";

import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import {
  AI_DATA_DISCLOSURE,
  CURRENT_AI_CONSENT_VERSION,
} from "@flatsby/validators/ai-consent";

import { useTRPC } from "~/trpc/react";

interface AIConsentScreenProps {
  onConsent: () => void;
  onDecline: () => void;
}

export function AIConsentScreen({
  onConsent,
  onDecline,
}: AIConsentScreenProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateConsent = useMutation(
    trpc.user.updateAIConsent.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.user.getAIConsentStatus.queryKey(),
        });
        onConsent();
      },
    }),
  );

  const handleAccept = () => {
    updateConsent.mutate({
      accepted: true,
      version: CURRENT_AI_CONSENT_VERSION,
    });
  };

  return (
    <div className="flex flex-col items-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Shield className="text-primary h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Third-Party AI Data Sharing</h1>
          <p className="text-muted-foreground mt-2">
            {AI_DATA_DISCLOSURE.sharingStatement}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5" />
              Your Data Will Be Shared With
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {AI_DATA_DISCLOSURE.providers.map((provider, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="bg-primary/20 mt-0.5 rounded-full p-1">
                  <Check className="text-primary h-3 w-3" />
                </div>
                <div>
                  <span className="font-medium">{provider.name}</span>
                  <p className="text-muted-foreground text-sm">
                    {provider.description}
                  </p>
                </div>
              </div>
            ))}
            <div className="border-t pt-3">
              <p className="text-muted-foreground text-sm">
                via {AI_DATA_DISCLOSURE.gateway}:{" "}
                {AI_DATA_DISCLOSURE.gatewayDescription}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Check className="h-5 w-5" />
              Data Shared With Third Parties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {AI_DATA_DISCLOSURE.dataShared.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="bg-primary/20 mt-0.5 rounded-full p-1">
                    <Check className="text-primary h-3 w-3" />
                  </div>
                  <span className="text-muted-foreground text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldOff className="h-5 w-5" />
              Data NOT Shared
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {AI_DATA_DISCLOSURE.notShared.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="bg-destructive/20 mt-0.5 rounded-full p-1">
                    <X className="text-destructive h-3 w-3" />
                  </div>
                  <span className="text-muted-foreground text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-5 w-5" />
              How Your Data Is Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {AI_DATA_DISCLOSURE.usage}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-center font-medium">
              {AI_DATA_DISCLOSURE.permissionRequest}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              onClick={handleAccept}
              disabled={updateConsent.isPending}
              className="w-full"
            >
              Yes, I Consent
            </Button>
            <Button
              variant="outline"
              onClick={onDecline}
              disabled={updateConsent.isPending}
              className="w-full"
            >
              No, Do Not Share
            </Button>
          </CardFooter>
        </Card>

        <div className="text-center">
          <Link
            href="/legal/privacy"
            className="text-primary text-sm underline"
          >
            View full Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
