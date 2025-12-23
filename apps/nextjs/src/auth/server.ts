import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { nextCookies } from "better-auth/next-js";
import { importPKCS8, SignJWT } from "jose";

import { initAuth } from "@flatsby/auth";

import { env } from "~/env";

const baseUrl =
  env.VERCEL_ENV === "production"
    ? `${env.BETTER_AUTH_URL}`
    : env.VERCEL_ENV === "preview"
      ? `https://${env.VERCEL_URL}`
      : "http://localhost:3000";

export const auth = initAuth({
  baseUrl,
  productionUrl: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  appleServiceId: env.APPLE_SERVICE_ID,
  appleBundleId: env.APPLE_BUNDLE_ID,
  applePrivateKey: env.APPLE_PRIVATE_KEY,
  appleTeamId: env.APPLE_TEAM_ID,
  appleKeyId: env.APPLE_KEY_ID,
  appleClientSecret: await makeAppleClientSecret(),
  extraPlugins: [nextCookies()],
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

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
