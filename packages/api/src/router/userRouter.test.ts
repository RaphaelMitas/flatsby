import { describe, expect, it, vi } from "vitest";

import { testContext, testUser } from "./testContext";
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

const caller = userRouter.createCaller(testContext(testUser));

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
