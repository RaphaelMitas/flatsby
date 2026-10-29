import type { BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { oAuthProxy, testUtils } from "better-auth/plugins";

import { db } from "@flatsby/db/client";

export interface OAuthCallback {
  providerId: string;
  redirect: URL;
  headers: Headers | undefined;
}

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
  trustedOrigins: string[];
  onUserCreated?: (headers: Headers | undefined) => Promise<void>;
  onOAuthCallback?: (callback: OAuthCallback) => Promise<void>;
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
    trustedOrigins: ["flatsby://", "expo://", ...options.trustedOrigins],
    hooks: {
      // Every outcome Better Auth handles leaves the callback as a redirect, so it's read from the location
      after: createAuthMiddleware(async (ctx) => {
        const providerId = ctx.params?.id;
        const location = ctx.context.responseHeaders?.get("location");
        // Apple's form_post arrives as a POST that only forwards to the GET callback
        if (
          !ctx.path.startsWith("/callback/") ||
          ctx.method === "POST" ||
          !providerId ||
          !location
        ) {
          return;
        }
        await options.onOAuthCallback?.({
          providerId,
          redirect: new URL(location, ctx.context.baseURL),
          headers: ctx.headers ?? ctx.request?.headers,
        });
      }),
    },
    databaseHooks: {
      user: {
        create: {
          after: async (_user, context) => {
            await options.onUserCreated?.(
              context?.headers ?? context?.request?.headers,
            );
          },
        },
      },
    },
    user: {
      modelName: "users",
      additionalFields: {
        // Set only through updatePaypalHandle, which validates it
        paypalHandle: { type: "string", required: false, input: false },
      },
    },
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
