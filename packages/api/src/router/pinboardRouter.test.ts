import type { CreatePinInput } from "@flatsby/validators/pinboard";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pinboardRouter } from "./pinboardRouter";
import { testContext, testUser } from "./testContext";

const { fakeDb, touchPins } = vi.hoisted(() => {
  const touchPins = vi.fn(() => {
    throw new Error("pins were read or written");
  });
  return {
    touchPins,
    fakeDb: {
      query: { groupMembers: { findFirst: vi.fn() } },
      select: touchPins,
      insert: touchPins,
      update: touchPins,
      delete: touchPins,
    },
  };
});

vi.mock("@flatsby/db/client", () => ({ db: fakeDb }));

const caller = pinboardRouter.createCaller(testContext(testUser));
const entry = {
  title: "WiFi",
  body: "",
  icon: "wifi",
  wifi: { ssid: "FRITZ!Box 7590", password: "secret" },
} satisfies Omit<CreatePinInput, "groupId">;

beforeEach(() => {
  vi.clearAllMocks();
  fakeDb.query.groupMembers.findFirst.mockResolvedValue(undefined);
});

describe("pinboard", () => {
  it.each([
    ["list", () => caller.list({ groupId: 3 })],
    ["create", () => caller.create({ groupId: 3, ...entry })],
    ["update", () => caller.update({ groupId: 3, id: 1, ...entry })],
    ["delete", () => caller.delete({ groupId: 3, id: 1 })],
  ])("%s refuses someone who is not in the group", async (_name, call) => {
    await expect(call()).resolves.toMatchObject({ success: false });
    expect(touchPins).not.toHaveBeenCalled();
  });
});
