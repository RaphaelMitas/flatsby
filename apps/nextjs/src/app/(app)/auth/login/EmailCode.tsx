"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { InputOTP, InputOTPGroups } from "@flatsby/ui/input-otp";
import {
  codeFromText,
  digitsOnly,
  SIGN_IN_CODE_GROUP,
  SIGN_IN_CODE_LENGTH,
  SIGN_IN_CODE_TTL_MINUTES,
} from "@flatsby/validators/login";
import { asksForName } from "@flatsby/validators/user";
import { useSignInCode } from "@flatsby/validators/useSignInCode";

import { signInCode } from "~/auth/client";
import { sendLoginEvent } from "./send-login-event";

export interface EmailAttempt {
  email: string;
  event: { provider: "email"; attempt_id: string; url: string };
}

export default function EmailCode({
  attempt,
  callbackURL,
  onChangeEmail,
}: {
  attempt: EmailAttempt;
  callbackURL: string;
  onChangeEmail: () => void;
}) {
  const t = useTranslations();
  const { email } = attempt;
  const signedIn = useRef(false);
  const { code, change, error, expired, resent, busy, waitSeconds, resend } =
    useSignInCode({
      email,
      client: signInCode,
      onFailed: (stage, errorCode) =>
        sendLoginEvent({
          ...attempt.event,
          event: "login_failed",
          stage,
          error_code: errorCode,
        }),
      onSignedIn: (user) => {
        signedIn.current = true;
        sendLoginEvent({ ...attempt.event, event: "login_succeeded" });
        window.location.assign(
          asksForName(user)
            ? `/auth/name?next=${encodeURIComponent(callbackURL)}`
            : callbackURL,
        );
      },
    });

  const cancel = () =>
    sendLoginEvent({
      ...attempt.event,
      event: "login_cancelled",
      stage: "code",
    });
  // Closing the tab counts as giving up, like leaving the app's code screen
  const leave = useEffectEvent(() => {
    if (!signedIn.current) cancel();
  });
  useEffect(() => {
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, []);

  return (
    <div className="flex flex-col gap-4" data-testid="auth-code-step">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("auth.code.title")}</h2>
        <p className="text-muted-foreground text-sm">
          {t.rich("auth.code.sentTo", {
            email,
            length: SIGN_IN_CODE_LENGTH,
            minutes: SIGN_IN_CODE_TTL_MINUTES,
            b: (chunks) => (
              <span className="text-foreground font-medium">{chunks}</span>
            ),
          })}
        </p>
      </div>
      {/* input-otp splices a paste in at the cursor, so a whole code replaces what was typed instead */}
      <div
        onPasteCapture={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (codeFromText(pasted).length < SIGN_IN_CODE_LENGTH) return;
          event.preventDefault();
          event.stopPropagation();
          change(pasted);
        }}
      >
        <InputOTP
          data-testid="auth-code-input"
          autoFocus
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="^\d+$"
          pasteTransformer={digitsOnly}
          maxLength={SIGN_IN_CODE_LENGTH}
          value={code}
          onChange={change}
          disabled={expired}
          containerClassName="justify-center"
        >
          <InputOTPGroups
            length={SIGN_IN_CODE_LENGTH}
            groupSize={SIGN_IN_CODE_GROUP}
            invalid={error !== null}
            slotClassName="bg-background h-12 w-10 text-lg"
          />
        </InputOTP>
      </div>
      {error && (
        <p className="text-destructive text-sm" data-testid="auth-code-error">
          {t(error)}
        </p>
      )}
      {resent && (
        <p
          className="text-muted-foreground text-sm"
          data-testid="auth-code-resent"
        >
          {t("auth.code.resent")}
        </p>
      )}
      {busy && <LoadingSpinner className="self-center" />}
      <div className="flex flex-col items-center gap-1">
        <p className="text-muted-foreground text-xs">
          {t("auth.code.notArrived")}
        </p>
        <Button
          type="button"
          variant={expired ? "default" : "link"}
          className={expired ? "w-full" : undefined}
          data-testid="auth-code-resend-button"
          disabled={busy || waitSeconds > 0}
          onClick={() => void resend()}
        >
          {waitSeconds > 0
            ? t("auth.code.resendIn", { seconds: waitSeconds })
            : t("auth.code.resend")}
        </Button>
        <Button
          type="button"
          variant="link"
          className="text-muted-foreground"
          data-testid="auth-code-change-email"
          onClick={() => {
            cancel();
            onChangeEmail();
          }}
        >
          {t("auth.code.changeEmail")}
        </Button>
      </div>
    </div>
  );
}
