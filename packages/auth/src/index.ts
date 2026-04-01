import type { BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { oAuthProxy, testUtils } from "better-auth/plugins";

import { db } from "@flatsby/db/client";

export function initAuth(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  nodeEnv: string;
  enableTestUtils?: boolean;
  googleClientId: string;
  googleClientSecret: string;
  appleServiceId: string;
  appleBundleId: string;
  applePrivateKey: string;
  appleTeamId: string;
  appleKeyId: string;
  appleClientSecret: string;
}) {
  const config = {
    database: drizzleAdapter(db, { provider: "pg" }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      expo(),
      nextCookies(),
      ...(options.enableTestUtils ? [testUtils()] : []),
    ],
    socialProviders: {
      google: {
        clientId: options.googleClientId,
        clientSecret: options.googleClientSecret,
        ...(options.nodeEnv === "production" && {
          redirectURI: `${options.productionUrl}/api/auth/callback/google`,
        }),
      },
      apple: {
        clientId: options.appleServiceId,
        clientSecret: options.appleClientSecret,
        appBundleIdentifier: options.appleBundleId,
        ...(options.nodeEnv === "production" && {
          redirectURI: `${options.productionUrl}/api/auth/callback/apple`,
        }),
      },
    },
    trustedOrigins: ["flatsby://", "expo://"],
    user: { modelName: "users" },
    session: {
      modelName: "sessions",
    },
    account: {
      modelName: "accounts",
      accountLinking: { enabled: true, trustedProviders: ["google", "apple"] },
    },
    verification: { modelName: "verificationTokens" },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
