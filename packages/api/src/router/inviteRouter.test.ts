import { beforeEach, describe, expect, it, vi } from "vitest";

import { inviteRouter } from "./inviteRouter";
import { testContext, testUser } from "./testContext";

const { fakeDb, fakeTx, claimed, inserted } = vi.hoisted(() => {
  const claimed = vi.fn();
  const inserted = vi.fn(() => Promise.resolve([{ id: 9 }]));
  const fakeTx = {
    select: () => ({
      from: () => ({ where: () => ({ for: () => Promise.resolve([]) }) }),
    }),
    update: () => ({
      set: () => ({ where: () => ({ returning: claimed }) }),
    }),
    insert: () => ({ values: () => ({ returning: inserted }) }),
    query: {
      groupInvites: { findFirst: vi.fn() },
      groupMembers: { findMany: vi.fn() },
    },
  };
  return {
    claimed,
    inserted,
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
  fakeTx.query.groupMembers.findMany.mockResolvedValue([
    { id: 1, isActive: true, placeholderName: null },
  ]);
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
          {
            id: 1,
            userId: "user-2",
            placeholderName: null,
            user: { name: "Ruffy" },
          },
          { id: 2, userId: null, placeholderName: "Anna", user: null },
        ],
      },
      createdByMember: { placeholderName: null, user: { name: "Ruffy" } },
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
    expect(fakeTx.query.groupMembers.findMany).not.toHaveBeenCalled();
  });
});

describe("invite.join after being removed", () => {
  it("starts fresh instead of reviving a spot they had claimed", async () => {
    fakeTx.query.groupMembers.findMany.mockResolvedValue([
      { id: 2, isActive: false, placeholderName: "Anna" },
    ]);

    await expect(
      inviteRouter.createCaller(testContext(testUser)).join({ code }),
    ).resolves.toMatchObject({ success: true });
    expect(inserted).toHaveBeenCalled();
    expect(claimed).not.toHaveBeenCalled();
  });
});

describe("invite.join with a placeholder", () => {
  const claim = () =>
    inviteRouter
      .createCaller(testContext(testUser))
      .join({ code, placeholderId: 2 });

  beforeEach(() => {
    fakeTx.query.groupMembers.findMany.mockResolvedValue([]);
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
    fakeTx.query.groupMembers.findMany.mockResolvedValue([
      { id: 1, isActive: true, placeholderName: null },
    ]);

    await expect(claim()).resolves.toMatchObject({ success: true });
    expect(claimed).not.toHaveBeenCalled();
  });
});
