import type { BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import { db } from "@flatsby/db/client";

export function initAuth(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
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
        /**
         * Auto-inference blocked by https://github.com/better-auth/better-auth/pull/2891
         */
        currentURL: options.baseUrl,
        productionURL: options.productionUrl,
      }),
      expo(),
    ],
    socialProviders: {
      google: {
        clientId: options.googleClientId,
        clientSecret: options.googleClientSecret,
        redirectURI: `${options.productionUrl}/api/auth/callback/google`,
      },
      apple: {
        clientId: options.appleServiceId,
        clientSecret: options.appleClientSecret,
        redirectURI: `${options.productionUrl}/api/auth/callback/apple`,
        appBundleIdentifier: options.appleBundleId,
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
