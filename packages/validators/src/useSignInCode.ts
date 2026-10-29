import type { MessageKey } from "@flatsby/i18n/message-key";
import { useEffect, useRef, useState } from "react";

import { msg } from "@flatsby/i18n/message-key";

import {
  isRetryableCodeError,
  SIGN_IN_CODE_LENGTH,
  SIGN_IN_CODE_RESEND_SECONDS,
  signInCodeError,
  startFailureCode,
  thrownFailureCode,
} from "./login";

interface AuthError {
  code?: string;
  status: number;
}

export interface SignedInUser {
  name: string;
  email: string;
  createdAt: Date;
}

export interface SignInCodeClient {
  send: (email: string) => Promise<{ error: AuthError | null }>;
  signIn: (
    email: string,
    code: string,
  ) => Promise<{
    data: { user: SignedInUser } | null;
    error: AuthError | null;
  }>;
}

export type OnCodeFailed = (stage: "start" | "code", errorCode: string) => void;

export async function requestSignInCode(
  client: SignInCodeClient,
  email: string,
  onFailed: OnCodeFailed,
): Promise<MessageKey | null> {
  try {
    const { error } = await client.send(email);
    if (!error) return null;
    onFailed("start", startFailureCode(error));
    return signInCodeError(error);
  } catch (thrown) {
    onFailed("start", thrownFailureCode(thrown));
    return msg("auth.code.failed");
  }
}

const resendDeadline = () => Date.now() + SIGN_IN_CODE_RESEND_SECONDS * 1000;

export function useSignInCode({
  email,
  client,
  onFailed,
  onSignedIn,
}: {
  email: string;
  client: SignInCodeClient;
  onFailed: OnCodeFailed;
  onSignedIn: (user: SignedInUser) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<MessageKey | null>(null);
  const [expired, setExpired] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  // State lags a second change event in the same tick, and iOS autofill can send two
  const verifying = useRef(false);
  const [resendAt, setResendAt] = useState(resendDeadline);
  const [now, setNow] = useState(() => Date.now());
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (waitSeconds === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitSeconds]);

  const verify = async (otp: string) => {
    verifying.current = true;
    setBusy(true);
    setResent(false);
    try {
      const { data, error: signInError } = await client.signIn(email, otp);
      if (signInError) {
        onFailed("code", startFailureCode(signInError));
        setError(signInCodeError(signInError));
        setCode("");
        setExpired(!isRetryableCodeError(signInError));
        return;
      }
      if (data) onSignedIn(data.user);
    } catch (thrown) {
      onFailed("code", thrownFailureCode(thrown));
      setError(msg("auth.code.failed"));
      setCode("");
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  };

  // A code pasted over a half-typed one lands at the end, so the last digits win
  const change = (text: string) => {
    if (verifying.current || expired) return;
    const digits = text.replace(/\D/g, "").slice(-SIGN_IN_CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === SIGN_IN_CODE_LENGTH) void verify(digits);
  };

  const resend = async () => {
    setBusy(true);
    setResent(false);
    const failure = await requestSignInCode(client, email, onFailed);
    setBusy(false);
    setError(failure);
    if (failure) return;
    setExpired(false);
    setCode("");
    setResent(true);
    setResendAt(resendDeadline());
    setNow(Date.now());
  };

  return { code, change, error, expired, resent, busy, waitSeconds, resend };
}
