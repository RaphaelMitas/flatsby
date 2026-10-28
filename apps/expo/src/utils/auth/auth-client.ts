import { requireOptionalNativeModule } from "expo";
import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "../base-url";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: "flatsby",
      storagePrefix: "flatsby",
      storage: SecureStore,
    }),
  ],
});

// Siri adds items from Swift with this session, so it needs the same server
requireOptionalNativeModule<{ setApiBaseUrl: (url: string) => void }>(
  "FlatsbySiri",
)?.setApiBaseUrl(getBaseUrl());

export const { signIn, signOut, useSession } = authClient;
