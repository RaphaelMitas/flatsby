import type { PasskeyDevice } from "@flatsby/validators/usePasskey";
import { useSyncExternalStore } from "react";

import {
  parsePasskeyDevice,
  PASSKEY_DEVICE_KEY,
} from "@flatsby/validators/usePasskey";

export const passkeysSupported = () =>
  typeof window !== "undefined" &&
  typeof window.PublicKeyCredential === "function";

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
