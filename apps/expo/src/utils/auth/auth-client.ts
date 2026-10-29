import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "../base-url";
import { languageTags } from "../intl-provider";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: "flatsby",
      storagePrefix: "flatsby",
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
  fetchOptions: {
    // Sign-in codes are mailed in the app's language
    onRequest: (context) => {
      context.headers.set("Accept-Language", languageTags().join(","));
    },
  },
});

export const { signIn, useSession } = authClient;

// Reminders on this phone belong to the account that scheduled them
export async function signOut() {
  await Promise.all([
    Notifications.cancelAllScheduledNotificationsAsync(),
    Notifications.dismissAllNotificationsAsync(),
  ]).catch(console.error);
  return authClient.signOut();
}
