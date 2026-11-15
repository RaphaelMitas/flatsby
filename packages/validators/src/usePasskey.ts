import type { MessageKey } from "@flatsby/i18n/message-key";
import { useRef, useState } from "react";

import { msg } from "@flatsby/i18n/message-key";

import type { AuthError } from "./login";
import { passkeyCancelled, startFailureCode, thrownFailureCode } from "./login";

export type PasskeyDevice = "used" | "dismissed" | "unknown";

export const parsePasskeyDevice = (saved: string | null): PasskeyDevice =>
  saved === "used" || saved === "dismissed" ? saved : "unknown";

export const PASSKEY_DEVICE_KEY = "passkey-device";

export const PASSKEY_NAME_MAX_LENGTH = 64;

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
  const inFlight = useRef(false);

  const start = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { error: failure } = await run();
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
    setDraft: (next: string | null) => {
      setDraft(next);
      setFailed(false);
    },
    busy,
    failed,
    saveName,
    remove: () => void change(remove),
  };
}
