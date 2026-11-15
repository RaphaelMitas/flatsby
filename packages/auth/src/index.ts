import type { BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { getAuthenticatorName, passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, oAuthProxy, testUtils } from "better-auth/plugins";

import { db } from "@flatsby/db/client";
import { SIGN_IN_CODE_TTL_SECONDS } from "@flatsby/validators/login";
import { ANDROID_SIGNING_CERTS } from "@flatsby/validators/store";
import { defaultUserName } from "@flatsby/validators/user";

import { allowSignInCode } from "./sign-in-code-limit";

const androidOrigin = (fingerprint: string) =>
  `android:apk-key-hash:${Buffer.from(fingerprint.replaceAll(":", ""), "hex").toString("base64url")}`;

const SEND_CODE_PATH = "/email-otp/send-verification-otp";

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
  const limitRequests =
    options.nodeEnv === "production" && !options.enableTestUtils;
  const site = new URL(options.baseUrl);
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
      passkey({
        rpID: site.hostname,
        rpName: "Flatsby",
        origin: [site.origin, ...ANDROID_SIGNING_CERTS.map(androidOrigin)],
        schema: { passkey: { modelName: "passkeys" } },
        registration: {
          afterVerification: async ({ verification }) => ({
            name: getAuthenticatorName(verification.registrationInfo?.aaguid),
          }),
        },
      }),
      nextCookies(),
      ...(options.enableTestUtils ? [testUtils()] : []),
    ],
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
        "/get-session": false,
        "/sign-in/email-otp": { window: 60, max: 10 },
        [SEND_CODE_PATH]: { window: 60, max: 10 },
        "/sign-in/social": { window: 60, max: 10 },
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
            throw new APIError("BAD_GATEWAY", { code: "SEND_FAILED" });
          }
          return;
        }
        const providerId = ctx.params?.id;
        const location = ctx.context.responseHeaders?.get("location");
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
    user: {
      modelName: "users",
      additionalFields: {
        analyticsOptOut: { type: "boolean", defaultValue: false, input: false },
        paypalHandle: { type: "string", required: false, input: false },
      },
    },
    session: {
      modelName: "sessions",
    },
    account: {
      modelName: "accounts",
      accountLinking: { enabled: true },
    },
    verification: { modelName: "verificationTokens" },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
