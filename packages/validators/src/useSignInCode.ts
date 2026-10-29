import type { MessageKey } from "@flatsby/i18n/message-key";
import { useEffect, useRef, useState } from "react";

import { msg } from "@flatsby/i18n/message-key";

import type { AuthError } from "./login";
import {
  codeFromText,
  isRetryableCodeError,
  SIGN_IN_CODE_LENGTH,
  SIGN_IN_CODE_RESEND_SECONDS,
  SIGN_IN_CODE_TTL_SECONDS,
  signInCodeError,
  startFailureCode,
  thrownFailureCode,
} from "./login";
import { userEmailSchema } from "./user";

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

async function requestSignInCode(
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

// The login screen's email step: validate, count the tap, send the first code
export function useSendSignInCode({
  client,
  onTapped,
  onFailed,
  onSent,
}: {
  client: SignInCodeClient;
  onTapped: () => void;
  onFailed: OnCodeFailed;
  onSent: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<MessageKey | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (sending) return;
    const parsed = userEmailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setError(msg("settings.validation.emailInvalid"));
      return;
    }
    onTapped();
    setError(null);
    setSending(true);
    const failure = await requestSignInCode(client, parsed.data, onFailed);
    setSending(false);
    setError(failure);
    if (!failure) onSent(parsed.data);
  };

  const changeEmail = (text: string) => {
    setEmail(text);
    setError(null);
  };

  return { email, changeEmail, error, sending, send };
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
  const inFlight = useRef(false);
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [resendAt, setResendAt] = useState(resendDeadline);
  const [now, setNow] = useState(() => Date.now());
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (waitSeconds === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitSeconds]);

  const run = async (request: () => Promise<void>) => {
    inFlight.current = true;
    setBusy(true);
    setResent(false);
    try {
      await request();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const verify = (otp: string) =>
    run(async () => {
      try {
        const { data, error: signInError } = await client.signIn(email, otp);
        if (!signInError) {
          if (data) onSignedIn(data.user);
          return;
        }
        onFailed("code", startFailureCode(signInError));
        setCode("");
        // Better Auth sweeps expired codes, so one past its lifetime comes back as wrong instead of expired
        const pastLifetime =
          Date.now() > sentAt + SIGN_IN_CODE_TTL_SECONDS * 1000;
        if (pastLifetime && signInError.code === "INVALID_OTP") {
          setError(msg("auth.code.expired"));
          setExpired(true);
          return;
        }
        setError(signInCodeError(signInError));
        setExpired(!isRetryableCodeError(signInError));
      } catch (thrown) {
        onFailed("code", thrownFailureCode(thrown));
        setError(msg("auth.code.failed"));
        setCode("");
      }
    });

  const change = (text: string) => {
    if (inFlight.current || expired) return;
    const digits = codeFromText(text);
    setCode(digits);
    setError(null);
    if (digits.length === SIGN_IN_CODE_LENGTH) void verify(digits);
  };

  const resend = () =>
    run(async () => {
      const failure = await requestSignInCode(client, email, onFailed);
      setError(failure);
      if (failure) return;
      setExpired(false);
      setCode("");
      setResent(true);
      setSentAt(Date.now());
      setResendAt(resendDeadline());
      setNow(Date.now());
    });

  return { code, change, error, expired, resent, busy, waitSeconds, resend };
}
