"use client";

import type { MessageKey } from "@flatsby/i18n/message-key";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@flatsby/ui/button";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@flatsby/ui/input-otp";
import {
  isRetryableCodeError,
  SIGN_IN_CODE_LENGTH,
  SIGN_IN_CODE_RESEND_SECONDS,
  signInCodeError,
  startFailureCode,
  thrownFailureCode,
} from "@flatsby/validators/login";
import { asksForName } from "@flatsby/validators/user";

import { authClient } from "~/auth/client";
import { sendLoginEvent } from "./send-login-event";

export interface EmailAttempt {
  email: string;
  event: { provider: "email"; attempt_id: string; url: string };
}

const GROUP = SIGN_IN_CODE_LENGTH / 2;
const SLOT_GROUPS = [0, GROUP].map((offset) =>
  Array.from({ length: GROUP }, (_, i) => offset + i),
);

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
  const [code, setCode] = useState("");
  const [error, setError] = useState<MessageKey | null>(null);
  const [expired, setExpired] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(
    () => Date.now() + SIGN_IN_CODE_RESEND_SECONDS * 1000,
  );
  const [now, setNow] = useState(() => Date.now());
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (waitSeconds === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitSeconds]);

  const failed = (stage: "start" | "code", errorCode: string) =>
    sendLoginEvent({
      ...attempt.event,
      event: "login_failed",
      stage,
      error_code: errorCode,
    });

  const verify = async (otp: string) => {
    setBusy(true);
    setResent(false);
    try {
      const { error: signInError } = await authClient.signIn
        .emailOtp({ email, otp })
        .catch((thrown: unknown) => {
          failed("code", thrownFailureCode(thrown));
          setError("auth.code.failed");
          setCode("");
          throw thrown;
        });
      if (signInError) {
        failed("code", startFailureCode(signInError));
        setError(signInCodeError(signInError));
        setCode("");
        setExpired(!isRetryableCodeError(signInError));
        return;
      }
      sendLoginEvent({ ...attempt.event, event: "login_succeeded" });
      const { data } = await authClient.getSession();
      window.location.assign(
        data && asksForName(data)
          ? `/auth/name?next=${encodeURIComponent(callbackURL)}`
          : callbackURL,
      );
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setResent(false);
    try {
      const { error: sendError } = await authClient.emailOtp
        .sendVerificationOtp({ email, type: "sign-in" })
        .catch((thrown: unknown) => {
          failed("start", thrownFailureCode(thrown));
          setError("auth.code.failed");
          throw thrown;
        });
      if (sendError) {
        failed("start", startFailureCode(sendError));
        setError(signInCodeError(sendError));
        return;
      }
      setError(null);
      setExpired(false);
      setCode("");
      setResent(true);
      setResendAt(Date.now() + SIGN_IN_CODE_RESEND_SECONDS * 1000);
      setNow(Date.now());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" data-testid="auth-code-step">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t("auth.code.title")}</h2>
        <p className="text-muted-foreground text-sm">
          {t.rich("auth.code.sentTo", {
            email,
            b: (chunks) => (
              <span className="text-foreground font-medium">{chunks}</span>
            ),
          })}
        </p>
      </div>
      <InputOTP
        data-testid="auth-code-input"
        autoFocus
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="^\d+$"
        maxLength={SIGN_IN_CODE_LENGTH}
        value={code}
        onChange={(value) => {
          setCode(value);
          setError(null);
        }}
        onComplete={(value: string) => void verify(value)}
        disabled={busy || expired}
        containerClassName="justify-center"
      >
        {SLOT_GROUPS.map((slots, group) => (
          <div key={slots.join()} className="flex items-center gap-2">
            {group > 0 && <InputOTPSeparator />}
            <InputOTPGroup>
              {slots.map((index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  aria-invalid={error !== null}
                  className="bg-background h-12 w-10 text-lg"
                />
              ))}
            </InputOTPGroup>
          </div>
        ))}
      </InputOTP>
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
          disabled={busy || (!expired && waitSeconds > 0)}
          onClick={() => void resend()}
        >
          {!expired && waitSeconds > 0
            ? t("auth.code.resendIn", { seconds: waitSeconds })
            : t("auth.code.resend")}
        </Button>
        <Button
          type="button"
          variant="link"
          className="text-muted-foreground"
          data-testid="auth-code-change-email"
          onClick={() => {
            sendLoginEvent({
              ...attempt.event,
              event: "login_cancelled",
              stage: "code",
            });
            onChangeEmail();
          }}
        >
          {t("auth.code.changeEmail")}
        </Button>
      </div>
    </div>
  );
}
