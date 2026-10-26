import { beforeEach, describe, expect, it, vi } from "vitest";

import { inviteRouter } from "./inviteRouter";
import { testContext, testUser } from "./testContext";

const { fakeDb, fakeTx } = vi.hoisted(() => {
  const fakeTx = {
    select: () => ({
      from: () => ({ where: () => ({ for: () => Promise.resolve([]) }) }),
    }),
    query: {
      groupInvites: { findFirst: vi.fn() },
      groupMembers: { findFirst: vi.fn() },
    },
  };
  return {
    fakeTx,
    fakeDb: {
      query: { groupInvites: { findFirst: vi.fn() } },
      transaction: (run: (tx: typeof fakeTx) => Promise<unknown>) =>
        run(fakeTx),
    },
  };
});

vi.mock("@flatsby/db/client", () => ({ db: fakeDb }));

const code = "ABCDEFGH";

beforeEach(() => {
  vi.clearAllMocks();
  fakeDb.query.groupInvites.findFirst.mockResolvedValue({
    group: { id: 3, name: "Flat", profilePicture: null, groupMembers: [] },
    createdByMember: { user: { name: "Ruffy" } },
  });
  fakeTx.query.groupInvites.findFirst.mockResolvedValue({ groupId: 3 });
  fakeTx.query.groupMembers.findFirst.mockResolvedValue({
    id: 1,
    isActive: true,
  });
});

describe("invite.preview", () => {
  it("answers a signed-out visitor with an unknown code", async () => {
    fakeDb.query.groupInvites.findFirst.mockResolvedValue(undefined);

    await expect(
      inviteRouter.createCaller(testContext(null)).preview({ code }),
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
  const join = () =>
    inviteRouter.createCaller(testContext(testUser)).join({ code });

  it("opens the group when the user is already a member", async () => {
    await expect(join()).resolves.toEqual({
      success: true,
      data: { groupId: 3, groupName: "Flat" },
    });
  });

  it("refuses an invite reset after the preview loaded", async () => {
    fakeTx.query.groupInvites.findFirst.mockResolvedValue(undefined);

    await expect(join()).resolves.toMatchObject({
      success: false,
      error: {
        type: "NotFoundError",
        details: { messageKey: "errors.notFound.invite" },
      },
    });
    expect(fakeTx.query.groupMembers.findFirst).not.toHaveBeenCalled();
  });
});
