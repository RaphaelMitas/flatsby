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
      setError(msg("auth.passkey.failed"));
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
