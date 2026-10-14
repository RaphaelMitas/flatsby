"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { localePath } from "@flatsby/i18n/locale";
import { Button } from "@flatsby/ui/button";
import AppleIcon from "@flatsby/ui/custom/icons/AppleIcon";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";
import GoogleIcon from "@flatsby/ui/custom/icons/GoogleIcon";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import { signIn } from "~/auth/client";

const Login = () => {
  const t = useTranslations();
  const locale = useLocale();
  const [loading, setLoading] = useState<"apple" | "google" | "false">("false");

  return (
    <div className="bg-background flex h-screen w-full items-center justify-center">
      <div className="bg-muted flex flex-col gap-6 rounded-lg p-8">
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
        <div className="flex w-80 flex-col gap-6">
          <Button
            type="button"
            data-testid="auth-login-google-button"
            onClick={async () => {
              setLoading("google");

              await signIn.social({
                provider: "google",
                callbackURL: "/",
              });
              setLoading("false");
            }}
            disabled={loading !== "false"}
          >
            {loading === "google" ? (
              <>
                <LoadingSpinner className="mr-2" />{" "}
                {t("auth.login.signingInWithGoogle")}
              </>
            ) : (
              <>
                <GoogleIcon className="text-primary-foreground mr-2 h-5 w-5" />{" "}
                {t("auth.login.signInWithGoogle")}
              </>
            )}
          </Button>

          <Button
            type="button"
            data-testid="auth-login-apple-button"
            onClick={async () => {
              setLoading("apple");
              await signIn.social({
                provider: "apple",
                callbackURL: "/",
              });
              setLoading("false");
            }}
            disabled={loading !== "false"}
          >
            {loading === "apple" ? (
              <>
                <LoadingSpinner className="mr-2" />{" "}
                {t("auth.login.signingInWithApple")}
              </>
            ) : (
              <>
                <AppleIcon className="text-primary-foreground mr-2 h-5 w-5" />{" "}
                {t("auth.login.signInWithApple")}
              </>
            )}
          </Button>
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
