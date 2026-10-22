import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getOAuthState } from "better-auth/api";
import { importPKCS8, SignJWT } from "jose";

import { captureEvent, posthog } from "@flatsby/api/posthog";
import { initAuth } from "@flatsby/auth";

import { env } from "~/env";
import { captureVisit } from "~/utils/page-views";

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
});

// The Expo client starts OAuth with a deep link as its callback, the web app with a path
async function signupPlatform() {
  const callbackURL = (await getOAuthState())?.callbackURL ?? "/";
  return callbackURL.startsWith("/") || /^https?:/.test(callbackURL)
    ? "web"
    : "app";
}

async function onUserCreated(
  userId: string,
  requestHeaders: Headers | undefined,
) {
  if (!requestHeaders || !posthog) return;
  const platform = await signupPlatform();
  // OAuth calls back in the browser that started sign-in, so this hashes to that browser's visitor
  after(async () => {
    captureEvent({
      distinctId: userId,
      event: "signed_up",
      headers: requestHeaders,
      additionalProperties: { platform },
    });
    await Promise.all([
      captureVisit(
        "signed_up",
        requestHeaders,
        { url: `${env.BETTER_AUTH_URL}/api/auth/callback`, referrer: null },
        { platform },
      ),
      posthog?.flush(),
    ]);
  });
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
