import { initAuth } from "@flatsby/auth";
import { db } from "@flatsby/db/client";

import type { createTRPCContext } from "../trpc";

const now = new Date();

export const testUser = {
  id: "user-1",
  // i18n-ignore: test fixture, never shown to a user
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
  createdAt: now,
  updatedAt: now,
};

export const testContext = (
  user: typeof testUser | null,
): Awaited<ReturnType<typeof createTRPCContext>> => ({
  authApi: initAuth({
    baseUrl: "http://localhost:3000",
    productionUrl: "http://localhost:3000",
    secret: "test-secret-that-is-long-enough-for-better-auth",
    nodeEnv: "test",
    googleClientId: "",
    googleClientSecret: "",
    appleServiceId: "",
    appleBundleId: "",
    applePrivateKey: "",
    appleTeamId: "",
    appleKeyId: "",
    appleClientSecret: "",
    trustedOrigins: [],
  }).api,
  headers: new Headers(),
  session: user && {
    session: {
      id: "session-1",
      token: "token-1",
      userId: user.id,
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
    },
    user,
  },
  authMs: 0,
  db,
  locale: "en",
  requestId: "request-1",
});
