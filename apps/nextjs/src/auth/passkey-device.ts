import type { PasskeyDevice } from "@flatsby/validators/usePasskey";
import { useSyncExternalStore } from "react";

import {
  parsePasskeyDevice,
  PASSKEY_DEVICE_KEY,
  usePasskey,
} from "@flatsby/validators/usePasskey";

import { sendLoginEvent } from "~/app/(app)/auth/login/send-login-event";
import { authClient } from "./client";

export const readPasskeyDevice = () =>
  parsePasskeyDevice(localStorage.getItem(PASSKEY_DEVICE_KEY));

export const savePasskeyDevice = (state: PasskeyDevice) =>
  localStorage.setItem(PASSKEY_DEVICE_KEY, state);

const noSubscription = () => () => undefined;

// The server render can't know this browser, so hydration starts from "unknown"
export const usePasskeyDevice = () =>
  useSyncExternalStore(
    noSubscription,
    readPasskeyDevice,
    (): PasskeyDevice => "unknown",
  );

export function useAddPasskey(
  source: "offer" | "settings",
  onAdded?: () => void,
) {
  return usePasskey({
    run: () => authClient.passkey.addPasskey(),
    onDone: () => {
      savePasskeyDevice("used");
      sendLoginEvent({
        event: "passkey_created",
        source,
        url: window.location.href,
      });
      onAdded?.();
    },
  });
}
