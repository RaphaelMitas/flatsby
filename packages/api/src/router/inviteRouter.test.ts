import { beforeEach, describe, expect, it, vi } from "vitest";

import { inviteRouter } from "./inviteRouter";
import { testContext, testUser } from "./testContext";

const { fakeDb, fakeTx, claimed } = vi.hoisted(() => {
  const claimed = vi.fn();
  const fakeTx = {
    select: () => ({
      from: () => ({ where: () => ({ for: () => Promise.resolve([]) }) }),
    }),
    update: () => ({
      set: () => ({ where: () => ({ returning: claimed }) }),
    }),
    query: {
      groupInvites: { findFirst: vi.fn() },
      groupMembers: { findFirst: vi.fn() },
    },
  };
  return {
    claimed,
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

  it("shows placeholders only to a signed-in joiner, and never as members", async () => {
    fakeDb.query.groupInvites.findFirst.mockResolvedValue({
      group: {
        id: 3,
        name: "Flat",
        profilePicture: null,
        groupMembers: [
          { id: 1, userId: "user-2", name: null, user: { name: "Ruffy" } },
          { id: 2, userId: null, name: "Anna", user: null },
        ],
      },
      createdByMember: { name: null, user: { name: "Ruffy" } },
    });
    const preview = (user: typeof testUser | null) =>
      inviteRouter.createCaller(testContext(user)).preview({ code });

    await expect(preview(null)).resolves.toMatchObject({
      success: true,
      data: { memberCount: 1, placeholders: [], isMember: false },
    });
    await expect(preview(testUser)).resolves.toMatchObject({
      success: true,
      data: {
        memberCount: 1,
        members: [{ name: "Ruffy" }],
        placeholders: [{ id: 2, name: "Anna" }],
        isMember: false,
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

describe("invite.join with a placeholder", () => {
  const claim = () =>
    inviteRouter
      .createCaller(testContext(testUser))
      .join({ code, placeholderId: 2 });

  beforeEach(() => {
    fakeTx.query.groupMembers.findFirst.mockResolvedValue(undefined);
  });

  it("takes over the placeholder", async () => {
    claimed.mockResolvedValue([{ id: 2 }]);

    await expect(claim()).resolves.toEqual({
      success: true,
      data: { groupId: 3, groupName: "Flat" },
    });
  });

  it("tells the second of two joiners that the spot is gone", async () => {
    claimed.mockResolvedValue([]);

    await expect(claim()).resolves.toMatchObject({
      success: false,
      error: {
        type: "ConflictError",
        details: { messageKey: "errors.placeholderTaken" },
      },
    });
  });

  it("leaves the placeholder alone when the joiner is already a member", async () => {
    fakeTx.query.groupMembers.findFirst.mockResolvedValue({
      id: 1,
      isActive: true,
    });

    await expect(claim()).resolves.toMatchObject({ success: true });
    expect(claimed).not.toHaveBeenCalled();
  });
});
