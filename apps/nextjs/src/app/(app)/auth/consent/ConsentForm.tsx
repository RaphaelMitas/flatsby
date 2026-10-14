"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { localePath } from "@flatsby/i18n/locale";
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
  const t = useTranslations("auth.consent");
  const locale = useLocale();
  const tCommon = useTranslations("common");
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
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
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
                    {t.rich("agreeTerms", {
                      link: (chunks) => (
                        <Link
                          href={localePath(locale, "/legal/terms")}
                          target="_blank"
                          className="text-primary underline underline-offset-4"
                        >
                          {chunks}
                        </Link>
                      ),
                    })}
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    {t("termsHint")}
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
                    {t.rich("agreePrivacy", {
                      link: (chunks) => (
                        <Link
                          href={localePath(locale, "/legal/privacy")}
                          target="_blank"
                          className="text-primary underline underline-offset-4"
                        >
                          {chunks}
                        </Link>
                      ),
                    })}
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    {t("privacyHint")}
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {updateConsent.isPending ? tCommon("saving") : t("continue")}
            </Button>

            {updateConsent.error && (
              <p className="text-destructive text-center text-sm">
                {t("error")}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
