import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getOAuthState } from "better-auth/api";
import { importPKCS8, SignJWT } from "jose";

import { captureError } from "@flatsby/api/posthog";
import { initAuth } from "@flatsby/auth";
import {
  callbackOutcome,
  loginAttemptSchema,
  loginProviderSchema,
} from "@flatsby/validators/login";

import { env } from "~/env";
import { captureFor, captureVisit, withoutCookie } from "~/utils/page-views";

export const auth = initAuth({
  baseUrl: env.NEXT_PUBLIC_BETTER_AUTH_BASE_URL,
  productionUrl: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  nodeEnv: env.NODE_ENV,
  enableTestUtils: env.E2E_TESTING,
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  appleServiceId: env.APPLE_SERVICE_ID,
  appleBundleId: env.APPLE_BUNDLE_ID,
  applePrivateKey: env.APPLE_PRIVATE_KEY,
  appleTeamId: env.APPLE_TEAM_ID,
  appleKeyId: env.APPLE_KEY_ID,
  appleClientSecret: await makeAppleClientSecret(),
  // Previews are opened on the branch alias as well as on VERCEL_URL, the base URL.
  trustedOrigins: env.VERCEL_BRANCH_URL
    ? [`https://${env.VERCEL_BRANCH_URL}`]
    : [],
  onUserCreated,
  onOAuthCallback,
});

// The Expo client starts OAuth with a deep link as its callback, the web app with a path
const oauthPlatform = (callbackURL: string) =>
  callbackURL.startsWith("/") || /^https?:/.test(callbackURL) ? "web" : "app";

const callbackPage = {
  url: `${env.BETTER_AUTH_URL}/api/auth/callback`,
  referrer: null,
};

// Cookieless and never identified, so the signup counts toward its source without tying the visit to the account
async function onUserCreated(requestHeaders: Headers | undefined) {
  if (!requestHeaders) return;
  try {
    const state = await getOAuthState();
    const platform = oauthPlatform(state?.callbackURL ?? "/");
    after(() =>
      captureVisit("signed_up", withoutCookie(requestHeaders), callbackPage, {
        platform,
      }),
    );
  } catch (error) {
    // A throw here would fail a signup Better Auth already committed
    captureError({ error, operation: "auth.onUserCreated" });
  }
}

// The app passes its PostHog id along, so its events join the install; web stays cookieless
async function onOAuthCallback({
  providerId,
  redirect,
  headers,
}: {
  providerId: string;
  redirect: URL;
  headers: Headers | undefined;
}) {
  const provider = loginProviderSchema.safeParse(providerId);
  if (!headers || !provider.success) return;
  try {
    const state = await getOAuthState();
    const attempt = loginAttemptSchema.safeParse(state?.login);
    const platform = state ? oauthPlatform(state.callbackURL) : undefined;
    const { event, ...outcome } = callbackOutcome(redirect);
    const properties = {
      ...outcome,
      provider: provider.data,
      platform,
      attempt_id: attempt.data?.attemptId,
      // Like the app's own events before sign-in, so $identify still merges them into the account
      $process_person_profile: false,
    };
    const distinctId =
      platform === "app" ? attempt.data?.distinctId : undefined;
    after(() =>
      captureFor(distinctId, event, headers, callbackPage, properties),
    );
  } catch (error) {
    // A throw here would fail the sign-in itself
    captureError({ error, operation: "auth.onOAuthCallback" });
  }
}

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function signOutAndRedirect(): Promise<never> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/auth/login");
}

async function makeAppleClientSecret(): Promise<string> {
  try {
    const privateKeyPem = env.APPLE_PRIVATE_KEY;
    const privateKey = await importPKCS8(privateKeyPem, "ES256");
    const now = Math.floor(Date.now() / 1000);
    const sixMonthsInSeconds = 15777000;

    const payload = {
      iss: env.APPLE_TEAM_ID,
      iat: now,
      exp: now + sixMonthsInSeconds,
      aud: "https://appleid.apple.com",
      sub: env.APPLE_SERVICE_ID,
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID })
      .sign(privateKey);

    return jwt;
  } catch (error) {
    console.error("Error generating JWT:", error);
  }
  return "";
}
