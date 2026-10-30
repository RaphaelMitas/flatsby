import { Platform } from "react-native";

import {
  parsePasskeyDevice,
  PASSKEY_DEVICE_KEY,
} from "@flatsby/validators/usePasskey";

import { storedChoice } from "../stored-choice";

export const passkeyDevice = storedChoice(
  PASSKEY_DEVICE_KEY,
  parsePasskeyDevice,
);

// Android has Credential Manager passkeys from Android 9
export const passkeysSupported =
  Platform.OS === "ios" ||
  (Platform.OS === "android" && Platform.Version >= 28);
