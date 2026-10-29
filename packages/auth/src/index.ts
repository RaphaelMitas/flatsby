import type { BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, oAuthProxy, testUtils } from "better-auth/plugins";

import { db } from "@flatsby/db/client";
import { SIGN_IN_CODE_TTL_SECONDS } from "@flatsby/validators/login";
import { defaultUserName } from "@flatsby/validators/user";

import { allowSignInCode, refundSignInCode } from "./sign-in-code-limit";

const SEND_CODE_PATH = "/email-otp/send-verification-otp";

// Better Auth logs a failed send and answers success, so the after hook turns it back into an error
const failedSends = new WeakSet<Request>();

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
        expiresIn: SIGN_IN_CODE_TTL_SECONDS,
        storeOTP: "encrypted",
        // A resend after a slow first email keeps that email's code valid
        resendStrategy: "reuse",
        sendVerificationOTP: async ({ email, otp }, ctx) => {
          try {
            await options.sendSignInCode({
              email,
              code: otp,
              headers: ctx?.headers ?? ctx?.request?.headers,
            });
          } catch (error) {
            if (ctx?.request) failedSends.add(ctx.request);
            throw error;
          }
        },
      }),
      nextCookies(),
      ...(options.enableTestUtils ? [testUtils()] : []),
    ],
    // Codes only sign in; the other routes count guesses without a lock and send mail past the per-address cap
    disabledPaths: [
      "/email-otp/check-verification-otp",
      "/email-otp/verify-email",
      "/email-otp/request-password-reset",
      "/email-otp/reset-password",
      "/forget-password/email-otp",
      "/email-otp/request-email-change",
      "/email-otp/change-email",
    ],
    rateLimit: {
      enabled: limitRequests,
      storage: "database",
      modelName: "rateLimits",
      customRules: {
        // Every app open checks the session; a write per check buys nothing
        "/get-session": false,
        // Above the 3 tries a code allows, so a 4th wrong code reads as spent rather than rate limited
        "/sign-in/email-otp": { window: 60, max: 10 },
        // Flatmates on one Wi-Fi share an IP; the per-address cap still bounds mail to any one inbox
        [SEND_CODE_PATH]: { window: 60, max: 10 },
      },
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
        if (ctx.path !== SEND_CODE_PATH) return;
        if (ctx.body?.type !== "sign-in") throw new APIError("BAD_REQUEST");
        if (
          limitRequests &&
          typeof ctx.body.email === "string" &&
          !(await allowSignInCode(ctx.body.email))
        ) {
          throw new APIError("TOO_MANY_REQUESTS", { code: "TOO_MANY_CODES" });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path === SEND_CODE_PATH) {
          if (ctx.request && failedSends.has(ctx.request)) {
            if (limitRequests) await refundSignInCode(ctx.body.email);
            throw new APIError("BAD_GATEWAY", { code: "SEND_FAILED" });
          }
          return;
        }
        // Every outcome Better Auth handles leaves the callback as a redirect, so it's read from the location
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
          before: async (user, context) => {
            // A code sign-up's name and image come from the request body; the name step sets the real name
            const fromCode = context?.path === "/sign-in/email-otp";
            if (user.name && !fromCode) return;
            return {
              data: {
                ...user,
                name: defaultUserName(user.email),
                ...(fromCode && { image: null }),
              },
            };
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
      // No trustedProviders: an unverified provider email mustn't link into an email-code account
      accountLinking: { enabled: true },
    },
    verification: { modelName: "verificationTokens" },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
