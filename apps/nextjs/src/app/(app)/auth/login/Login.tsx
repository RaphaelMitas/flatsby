"use client";

import type { LoginAttempt, LoginProvider } from "@flatsby/validators/login";
import { useRef, useState } from "react";
import Link from "next/link";
import { uuidv7 } from "@posthog/core";
import { useLocale, useTranslations } from "next-intl";

import { localePath } from "@flatsby/i18n/locale";
import { Button } from "@flatsby/ui/button";
import AppleIcon from "@flatsby/ui/custom/icons/AppleIcon";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";
import GoogleIcon from "@flatsby/ui/custom/icons/GoogleIcon";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";
import { Input } from "@flatsby/ui/input";
import { Separator } from "@flatsby/ui/separator";
import { startFailureCode, thrownFailureCode } from "@flatsby/validators/login";
import { useSendSignInCode } from "@flatsby/validators/useSignInCode";

import type { EmailAttempt } from "./EmailCode";
import { signIn, signInCode } from "~/auth/client";
import EmailCode from "./EmailCode";
import { sendLoginEvent } from "./send-login-event";

const Login = ({ callbackURL }: { callbackURL: string }) => {
  const t = useTranslations();
  const locale = useLocale();
  const [loading, setLoading] = useState<LoginProvider | "false">("false");
  const [codeAttempt, setCodeAttempt] = useState<EmailAttempt | null>(null);
  const emailEvent = useRef<EmailAttempt["event"]>({
    provider: "email",
    attempt_id: "",
    url: "",
  });
  const emailStep = useSendSignInCode({
    client: signInCode,
    onTapped: () => {
      emailEvent.current = {
        provider: "email",
        attempt_id: uuidv7(),
        url: window.location.href,
      };
      sendLoginEvent({ ...emailEvent.current, event: "login_provider_tapped" });
    },
    onFailed: (stage, errorCode) =>
      sendLoginEvent({
        ...emailEvent.current,
        event: "login_failed",
        stage,
        error_code: errorCode,
      }),
    onSent: (email) => setCodeAttempt({ email, event: emailEvent.current }),
  });
  const busy = loading !== "false" || emailStep.sending;

  const signInWith = async (provider: LoginProvider) => {
    const attempt = {
      provider,
      attempt_id: uuidv7(),
      url: window.location.href,
    };
    sendLoginEvent({ ...attempt, event: "login_provider_tapped" });
    setLoading(provider);
    const failed = (errorCode: string) =>
      sendLoginEvent({
        ...attempt,
        event: "login_failed",
        error_code: errorCode,
      });
    try {
      const { error } = await signIn
        .social({
          provider,
          callbackURL,
          additionalData: {
            login: { attemptId: attempt.attempt_id } satisfies LoginAttempt,
          },
        })
        .catch((thrown: unknown) => {
          failed(thrownFailureCode(thrown));
          throw thrown;
        });
      if (error) failed(startFailureCode(error));
    } finally {
      setLoading("false");
    }
  };

  return (
    <div className="bg-background flex h-screen w-full items-center justify-center">
      <div className="bg-muted flex w-full max-w-sm flex-col gap-6 rounded-lg p-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <FlatsbyCat className="h-20 w-auto self-center" />
          <h1 className="text-4xl font-bold" data-testid="auth-login-title">
            Flatsby
          </h1>
          <p
            className="text-muted-foreground text-sm"
            data-testid="auth-login-tagline"
          >
            {t("auth.login.tagline")}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {codeAttempt ? (
            <EmailCode
              attempt={codeAttempt}
              callbackURL={callbackURL}
              onChangeEmail={() => setCodeAttempt(null)}
            />
          ) : (
            <>
              <form
                className="flex flex-col gap-3"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  void emailStep.send();
                }}
              >
                <Input
                  type="email"
                  autoComplete="username email"
                  inputMode="email"
                  aria-label={t("auth.login.email")}
                  aria-invalid={emailStep.error !== null}
                  placeholder={t("auth.login.emailPlaceholder")}
                  className="bg-background"
                  data-testid="auth-login-email-input"
                  value={emailStep.email}
                  onChange={(event) =>
                    emailStep.changeEmail(event.target.value)
                  }
                />
                {emailStep.error && (
                  <p
                    className="text-destructive text-sm"
                    data-testid="auth-login-email-error"
                  >
                    {t(emailStep.error)}
                  </p>
                )}
                <Button
                  type="submit"
                  data-testid="auth-login-email-button"
                  disabled={busy}
                >
                  {emailStep.sending ? (
                    <>
                      <LoadingSpinner className="mr-2" />
                      {t("auth.login.sendingCode")}
                    </>
                  ) : (
                    t("auth.login.continueWithEmail")
                  )}
                </Button>
              </form>
              <div className="text-muted-foreground flex items-center gap-3 text-xs">
                <Separator className="flex-1" />
                {t("auth.login.or")}
                <Separator className="flex-1" />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  data-testid="auth-login-google-button"
                  onClick={() => signInWith("google")}
                  disabled={busy}
                >
                  {loading === "google" ? (
                    <LoadingSpinner className="mr-2" />
                  ) : (
                    <GoogleIcon className="mr-2 h-5 w-5" />
                  )}
                  {t("auth.login.google")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  data-testid="auth-login-apple-button"
                  onClick={() => signInWith("apple")}
                  disabled={busy}
                >
                  {loading === "apple" ? (
                    <LoadingSpinner className="mr-2" />
                  ) : (
                    <AppleIcon className="mr-2 h-5 w-5" />
                  )}
                  {t("auth.login.apple")}
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="text-muted-foreground text-center text-xs">
          <p>
            {t.rich("auth.login.agreement", {
              terms: (chunks) => (
                <Link
                  href={localePath(locale, "/legal/terms")}
                  className="hover:text-foreground underline"
                  data-testid="auth-login-terms-link"
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href={localePath(locale, "/legal/privacy")}
                  className="hover:text-foreground underline"
                  data-testid="auth-login-privacy-link"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <p className="mt-2">
            <Link
              href={localePath(locale, "/legal/legal-notice")}
              className="hover:text-foreground underline"
              data-testid="auth-login-legal-notice-link"
            >
              {t("navigation.legalNotice")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
