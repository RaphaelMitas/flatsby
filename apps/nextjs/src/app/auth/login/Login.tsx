"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@flatsby/ui/button";
import AppleIcon from "@flatsby/ui/custom/icons/AppleIcon";
import GoogleIcon from "@flatsby/ui/custom/icons/GoogleIcon";
import HomeIcon from "@flatsby/ui/custom/icons/HomeIcon";
import LoadingSpinner from "@flatsby/ui/custom/loadingSpinner";

import { signIn } from "~/auth/client";

const Login = () => {
  const [loading, setLoading] = useState<"apple" | "google" | "false">("false");

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col gap-6 rounded-lg bg-muted p-8">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <HomeIcon className="h-20 w-fit self-center text-primary" />
          <h1 className="text-4xl font-bold">Flatsby</h1>
          <p className="text-sm text-muted-foreground">
            Manage your daily life with your flatmates.
          </p>
        </div>
        <div className="flex w-80 flex-col gap-6">
          <Button
            type="button"
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
                <LoadingSpinner className="mr-2" /> Signing in with Google
              </>
            ) : (
              <>
                <GoogleIcon className="mr-2 h-5 w-5 text-primary-foreground" />{" "}
                Sign in with Google
              </>
            )}
          </Button>

          <Button
            type="button"
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
                <LoadingSpinner className="mr-2" /> Signing in with Apple
              </>
            ) : (
              <>
                <AppleIcon className="mr-2 h-5 w-5 text-primary-foreground" />{" "}
                Sign in with Apple
              </>
            )}
          </Button>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          <p>
            By signing in, you agree to our{" "}
            <Link
              href="/legal/terms"
              className="underline hover:text-foreground"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/privacy"
              className="underline hover:text-foreground"
            >
              Privacy Policy
            </Link>
          </p>
          <p className="mt-2">
            <Link
              href="/legal/impressum"
              className="underline hover:text-foreground"
            >
              Impressum
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
