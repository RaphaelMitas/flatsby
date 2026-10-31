import { Platform } from "react-native";
import { usePostHog } from "posthog-react-native";

import {
  parsePasskeyDevice,
  PASSKEY_DEVICE_KEY,
  usePasskey,
} from "@flatsby/validators/usePasskey";

import { storedChoice } from "../stored-choice";
import { authClient } from "./auth-client";

export const passkeyDevice = storedChoice(
  PASSKEY_DEVICE_KEY,
  parsePasskeyDevice,
);

// Android has Credential Manager passkeys from Android 9
export const passkeysSupported =
  Platform.OS === "ios" ||
  (Platform.OS === "android" && Platform.Version >= 28);

export function useAddPasskey(
  source: "offer" | "settings",
  onAdded?: () => void,
) {
  const posthog = usePostHog();
  return usePasskey({
    run: () => authClient.passkey.addPasskey(),
    onDone: () => {
      passkeyDevice.save("used");
      posthog.capture("passkey_created", { source, platform: "app" });
      onAdded?.();
    },
  });
}
