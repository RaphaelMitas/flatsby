import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "../base-url";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: "flatcove",
      storagePrefix: "flatcove",
      storage: SecureStore,
    }),
  ],
});

export const { signIn, signOut, useSession, getSession, getCookie } =
  authClient;
