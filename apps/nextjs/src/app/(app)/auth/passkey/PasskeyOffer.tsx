"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheckBig } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import PasskeyIcon from "@flatsby/ui/custom/icons/PasskeyIcon";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { usePasskey } from "@flatsby/validators/usePasskey";

import { authClient } from "~/auth/client";
import { savePasskeyDevice } from "~/auth/passkey-device";
import { sendLoginEvent } from "../login/send-login-event";

export default function PasskeyOffer({ next }: { next: string }) {
  const t = useTranslations("auth.passkey");
  const router = useRouter();
  const [step, setStep] = useState<"checking" | "offer" | "created">(
    "checking",
  );

  // Without a built-in authenticator the offer would only lead to a QR code for another device
  useEffect(() => {
    void PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .catch(() => false)
      .then((available) => {
        if (available) setStep("offer");
        else router.replace(next);
      });
  }, [router, next]);

  const passkey = usePasskey({
    run: () => authClient.passkey.addPasskey(),
    onDone: () => {
      savePasskeyDevice("used");
      sendLoginEvent({
        event: "passkey_created",
        source: "offer",
        url: window.location.href,
      });
      setStep("created");
    },
  });

  const later = () => {
    savePasskeyDevice("dismissed");
    router.replace(next);
  };

  if (step === "checking") return null;

  return (
    <div className="bg-background flex h-screen w-full items-center justify-center">
      <div
        className="bg-muted flex w-full max-w-sm flex-col items-center gap-4 rounded-lg p-8 text-center"
        data-testid="auth-passkey-offer"
      >
        {step === "created" ? (
          <>
            <CircleCheckBig className="text-primary h-12 w-12" />
            <h1 className="text-xl font-semibold">{t("createdTitle")}</h1>
            <p className="text-muted-foreground text-sm">{t("createdBody")}</p>
            <Button
              className="w-full"
              data-testid="auth-passkey-continue"
              onClick={() => router.replace(next)}
            >
              {t("continue")}
            </Button>
          </>
        ) : (
          <>
            <PasskeyIcon className="h-12 w-12" />
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="text-muted-foreground text-sm">{t("bodyWeb")}</p>
            {passkey.error && (
              <p
                className="text-destructive text-sm"
                data-testid="auth-passkey-error"
              >
                {t("failed")}
              </p>
            )}
            <Button
              className="w-full"
              data-testid="auth-passkey-create"
              disabled={passkey.busy}
              onClick={() => void passkey.start()}
            >
              {passkey.busy && <LoadingSpinner className="mr-2" />}
              {t("create")}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              data-testid="auth-passkey-later"
              disabled={passkey.busy}
              onClick={later}
            >
              {t("later")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
