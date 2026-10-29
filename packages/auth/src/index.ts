import type { BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, oAuthProxy, testUtils } from "better-auth/plugins";

import { db } from "@flatsby/db/client";
import { defaultUserName } from "@flatsby/validators/user";

import { allowSignInCode } from "./sign-in-code-limit";

export interface SignInCode {
  email: string;
  code: string;
  headers: Headers | undefined;
}

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
  sendSignInCode: (signInCode: SignInCode) => Promise<void>;
  onUserCreated?: (headers: Headers | undefined) => Promise<void>;
  onOAuthCallback?: (callback: OAuthCallback) => Promise<void>;
}) {
  // e2e runs a production build, and every test shares one IP
  const limitRequests =
    options.nodeEnv === "production" && !options.enableTestUtils;
  const config = {
    database: drizzleAdapter(db, { provider: "pg" }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      expo(),
      emailOTP({
        storeOTP: "encrypted",
        sendVerificationOTP: ({ email, otp }, ctx) =>
          options.sendSignInCode({
            email,
            code: otp,
            headers: ctx?.headers ?? ctx?.request?.headers,
          }),
      }),
      nextCookies(),
      ...(options.enableTestUtils ? [testUtils()] : []),
    ],
    rateLimit: {
      enabled: limitRequests,
      storage: "database",
      modelName: "rateLimits",
      // Every app open checks the session; a write per check buys nothing
      customRules: { "/get-session": false },
    },
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
      before: createAuthMiddleware(async (ctx) => {
        if (
          !limitRequests ||
          ctx.path !== "/email-otp/send-verification-otp" ||
          typeof ctx.body?.email !== "string"
        ) {
          return;
        }
        if (!(await allowSignInCode(ctx.body.email))) {
          throw new APIError("TOO_MANY_REQUESTS");
        }
      }),
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
          before: async (user) => {
            if (user.name) return;
            return { data: { ...user, name: defaultUserName(user.email) } };
          },
          after: async (_user, context) => {
            await options.onUserCreated?.(
              context?.headers ?? context?.request?.headers,
            );
          },
        },
      },
    },
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
