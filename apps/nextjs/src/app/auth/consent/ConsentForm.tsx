"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { Checkbox } from "@flatsby/ui/checkbox";
import { Label } from "@flatsby/ui/label";

import { useTRPC } from "~/trpc/react";
import { CURRENT_LEGAL_VERSION } from "~/utils/consent-check";

export default function ConsentForm() {
  const router = useRouter();
  const trpc = useTRPC();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const updateConsent = useMutation(
    trpc.user.updateConsent.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          router.push("/");
        }
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (termsAccepted && privacyAccepted) {
      updateConsent.mutate({
        termsAccepted,
        privacyAccepted,
        version: CURRENT_LEGAL_VERSION,
      });
    }
  };

  const canSubmit =
    termsAccepted && privacyAccepted && !updateConsent.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Flatsby</CardTitle>
          <CardDescription>
            Please review and accept our terms to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) =>
                    setTermsAccepted(checked === true)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="terms" className="cursor-pointer">
                    I agree to the{" "}
                    <Link
                      href="/legal/terms"
                      target="_blank"
                      className="text-primary underline underline-offset-4"
                    >
                      Terms of Service
                    </Link>
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    By checking this box, you agree to be bound by our terms.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="privacy"
                  checked={privacyAccepted}
                  onCheckedChange={(checked) =>
                    setPrivacyAccepted(checked === true)
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="privacy" className="cursor-pointer">
                    I agree to the{" "}
                    <Link
                      href="/legal/privacy"
                      target="_blank"
                      className="text-primary underline underline-offset-4"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    By checking this box, you consent to our data processing.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {updateConsent.isPending ? "Saving..." : "Continue"}
            </Button>

            {updateConsent.error && (
              <p className="text-destructive text-center text-sm">
                Something went wrong. Please try again.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
