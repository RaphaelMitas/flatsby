import { beforeEach, describe, expect, it, vi } from "vitest";

import { initAuth } from "@flatsby/auth";
import { db } from "@flatsby/db/client";

import { Errors } from "../errors";
import { inviteRouter } from "./inviteRouter";

const fakeDb = vi.hoisted(() => ({
  query: { groupInvites: { findFirst: vi.fn() } },
  transaction: vi.fn(),
}));

// The real client validates DATABASE_URL on import, which would fail a local run without env vars
vi.mock("@flatsby/db/client", () => ({ db: fakeDb }));

const now = new Date();

const user = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
  createdAt: now,
  updatedAt: now,
};

const callerFor = (session: { user: typeof user } | null) =>
  inviteRouter.createCaller({
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
    session: session && {
      session: {
        id: "session-1",
        token: "token-1",
        userId: user.id,
        expiresAt: now,
        createdAt: now,
        updatedAt: now,
      },
      user: session.user,
    },
    authMs: 0,
    db,
    locale: "en",
    requestId: "request-1",
  });

beforeEach(() => {
  fakeDb.query.groupInvites.findFirst.mockResolvedValue({
    group: { id: 3, name: "Flat", profilePicture: null, groupMembers: [] },
    createdByMember: { user: { name: "Ruffy" } },
  });
});

describe("invite.preview", () => {
  it("answers a signed-out visitor with an unknown code", async () => {
    fakeDb.query.groupInvites.findFirst.mockResolvedValue(undefined);

    await expect(
      callerFor(null).preview({ code: "ABCDEFGH" }),
    ).resolves.toMatchObject({
      success: false,
      error: {
        type: "NotFoundError",
        details: { messageKey: "errors.notFound.invite" },
      },
    });
  });
});

describe("invite.join", () => {
  it("opens the group when the user is already a member", async () => {
    fakeDb.transaction.mockResolvedValue(
      Errors.conflict("errors.alreadyMember"),
    );

    await expect(
      callerFor({ user }).join({ code: "ABCDEFGH" }),
    ).resolves.toEqual({
      success: true,
      data: { groupId: 3, groupName: "Flat" },
    });
  });

  it("refuses an invite reset after the preview loaded", async () => {
    fakeDb.transaction.mockResolvedValue(Errors.notFound("invite"));

    await expect(
      callerFor({ user }).join({ code: "ABCDEFGH" }),
    ).resolves.toMatchObject({
      success: false,
      error: {
        type: "NotFoundError",
        details: { messageKey: "errors.notFound.invite" },
      },
    });
  });
});
