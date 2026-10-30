import type { MessageKey } from "@flatsby/i18n/message-key";
import { useRef, useState } from "react";

import { msg } from "@flatsby/i18n/message-key";

import type { AuthError } from "./login";
import { passkeyCancelled, startFailureCode, thrownFailureCode } from "./login";

// "used" once this device made or used a passkey, "dismissed" once the offer was declined here
export type PasskeyDevice = "used" | "dismissed" | "unknown";

export const parsePasskeyDevice = (saved: string | null): PasskeyDevice =>
  saved === "used" || saved === "dismissed" ? saved : "unknown";

export const PASSKEY_DEVICE_KEY = "passkey-device";

export const PASSKEY_NAME_MAX_LENGTH = 64;

// Better Auth only registers passkeys on a session younger than a day, so a stolen session can't add one
const passkeyError = (error: AuthError) =>
  error.code === "SESSION_NOT_FRESH"
    ? msg("auth.passkey.signInAgain")
    : msg("auth.passkey.failed");

export function usePasskey({
  run,
  onDone,
  onCancelled,
  onFailed,
}: {
  run: () => Promise<{ error: AuthError | null }>;
  onDone: () => void;
  onCancelled?: () => void;
  onFailed?: (errorCode: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  // A double tap would open a second system sheet behind the first
  const inFlight = useRef(false);

  const start = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error: failure } = await run();
      // An existing passkey on this device for this account is what was asked for
      if (
        !failure ||
        failure.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"
      ) {
        onDone();
        return;
      }
      if (passkeyCancelled(failure)) {
        onCancelled?.();
        return;
      }
      onFailed?.(startFailureCode(failure));
      setError(passkeyError(failure));
    } catch (thrown) {
      onFailed?.(thrownFailureCode(thrown));
      setError(msg("auth.passkey.failed"));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return { start, busy, error };
}

type PasskeyChange = () => Promise<{ error: unknown }>;

export function usePasskeyRow({
  rename,
  remove,
}: {
  rename: (name: string) => ReturnType<PasskeyChange>;
  remove: PasskeyChange;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const change = async (request: PasskeyChange, onSuccess?: () => void) => {
    setBusy(true);
    setFailed(false);
    const { error } = await request().catch((thrown: unknown) => ({
      error: thrown,
    }));
    setBusy(false);
    if (error) setFailed(true);
    else onSuccess?.();
  };

  const saveName = () => {
    const name = draft?.trim();
    if (!name) return;
    void change(
      () => rename(name),
      () => setDraft(null),
    );
  };

  return {
    draft,
    setDraft,
    busy,
    failed,
    saveName,
    remove: () => void change(remove),
  };
}
