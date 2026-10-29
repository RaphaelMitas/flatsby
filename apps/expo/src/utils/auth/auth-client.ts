import type { SignInCodeClient } from "@flatsby/validators/useSignInCode";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "../base-url";
import { languageTags } from "../intl-provider";
import { finishNameStep } from "./post-login-path";

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

export const signInCode: SignInCodeClient = {
  send: (email) =>
    authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }),
  signIn: (email, code) => authClient.signIn.emailOtp({ email, otp: code }),
};

// Reminders on this phone belong to the account that scheduled them, and so does a pending name step
export async function signOut() {
  finishNameStep();
  await Promise.all([
    Notifications.cancelAllScheduledNotificationsAsync(),
    Notifications.dismissAllNotificationsAsync(),
  ]).catch(console.error);
  return authClient.signOut();
}
