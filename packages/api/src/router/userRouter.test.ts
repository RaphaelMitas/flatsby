import { describe, expect, it, vi } from "vitest";

import { initAuth } from "@flatsby/auth";
import { db } from "@flatsby/db/client";

import { userRouter } from "./userRouter";

// The real client validates DATABASE_URL on import, which would fail a local run without env vars
vi.mock("@flatsby/db/client", () => ({ db: {} }));

vi.mock("../utils/autumn", () => ({
  checkCredits: vi.fn().mockRejectedValue(new Error("autumn is down")),
  autumn: {
    customers: {
      getOrCreate: vi.fn().mockRejectedValue(new Error("autumn is down")),
    },
  },
}));

const now = new Date();

const caller = userRouter.createCaller({
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
  session: {
    session: {
      id: "session-1",
      token: "token-1",
      userId: "user-1",
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
    },
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  },
  authMs: 0,
  db,
  locale: "en",
  requestId: "request-1",
});

describe("userRouter when Autumn fails", () => {
  it("answers getUsage without credits", async () => {
    await expect(caller.getUsage()).resolves.toEqual({ credits: null });
  });

  it("answers getSubscription with the free plan", async () => {
    await expect(caller.getSubscription()).resolves.toEqual({
      planId: "free",
      planName: "Free",
    });
  });
});
