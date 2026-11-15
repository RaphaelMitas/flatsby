import type { MessageKey } from "@flatsby/i18n/message-key";
import { useRef, useState, useSyncExternalStore } from "react";

import { msg } from "@flatsby/i18n/message-key";

import type { AuthError, LoginFailureStage } from "./login";
import type { SignedInUser } from "./user";
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

export type OnCodeFailed = (
  stage: LoginFailureStage,
  errorCode: string,
) => void;

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

const everySecond = (tick: () => void) => {
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
};

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
  const inFlight = useRef(false);

  const send = async () => {
    if (inFlight.current) return;
    const parsed = userEmailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setError(msg("settings.validation.emailInvalid"));
      return;
    }
    onTapped();
    setError(null);
    inFlight.current = true;
    setSending(true);
    const failure = await requestSignInCode(client, parsed.data, onFailed);
    inFlight.current = false;
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
  const locked = useRef(false);
  const [sentAt, setSentAt] = useState(() => Date.now());
  const resendAt = sentAt + SIGN_IN_CODE_RESEND_SECONDS * 1000;
  const secondsUntilResend = (now: number) =>
    expired ? 0 : Math.max(0, Math.ceil((resendAt - now) / 1000));
  const waitSeconds = useSyncExternalStore(
    everySecond,
    () => secondsUntilResend(Date.now()),
    () => secondsUntilResend(sentAt),
  );

  const run = async (request: () => Promise<boolean | void>) => {
    locked.current = true;
    setBusy(true);
    setResent(false);
    let signedIn = false;
    try {
      signedIn = (await request()) === true;
    } finally {
      locked.current = signedIn;
      setBusy(false);
    }
  };

  const verify = (otp: string) =>
    run(async () => {
      try {
        const { data, error: signInError } = await client.signIn(email, otp);
        if (!signInError) {
          if (data) onSignedIn(data.user);
          return true;
        }
        onFailed("code", startFailureCode(signInError));
        setCode("");
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
    if (locked.current || expired) return;
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
    });

  return { code, change, error, expired, resent, busy, waitSeconds, resend };
}
