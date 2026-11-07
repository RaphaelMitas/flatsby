import { beforeEach, describe, expect, it, vi } from "vitest";

import { PLANS } from "@flatsby/validators/billing";

import { checkCredits, getCreditUsage } from "./credits";

const env = vi.hoisted(() => ({ E2E_TESTING: false }));
const findFirst = vi.hoisted(() => vi.fn());

vi.mock("@flatsby/auth/env", () => ({ env }));
vi.mock("@flatsby/db/client", () => ({
  db: { query: { creditBalances: { findFirst } } },
}));

const user = { id: "user-1" };

describe("credits", () => {
  beforeEach(() => {
    env.E2E_TESTING = false;
    findFirst.mockReset();
  });

  it("gives a new month the whole free allowance", async () => {
    findFirst.mockResolvedValue(undefined);
    await expect(getCreditUsage(user.id)).resolves.toEqual({
      balance: PLANS.freeCredits,
      usage: 0,
    });
    await expect(checkCredits(user)).resolves.toEqual({ allowed: true });
  });

  it("denies once the allowance is spent and never shows a negative balance", async () => {
    findFirst.mockResolvedValue({ used: PLANS.freeCredits + 120 });
    await expect(getCreditUsage(user.id)).resolves.toEqual({
      balance: 0,
      usage: PLANS.freeCredits + 120,
    });
    await expect(checkCredits(user)).resolves.toEqual({ allowed: false });
  });

  it("denies every e2e stack without reading the balance", async () => {
    env.E2E_TESTING = true;
    await expect(checkCredits(user)).resolves.toEqual({ allowed: false });
    expect(findFirst).not.toHaveBeenCalled();
  });
});
