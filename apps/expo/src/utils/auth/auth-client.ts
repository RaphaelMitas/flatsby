import * as Notifications from "expo-notifications";
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

export const { signIn, useSession } = authClient;

// Reminders on this phone belong to the account that scheduled them
export async function signOut() {
  await Promise.all([
    Notifications.cancelAllScheduledNotificationsAsync(),
    Notifications.dismissAllNotificationsAsync(),
  ]).catch(console.error);
  return authClient.signOut();
}
