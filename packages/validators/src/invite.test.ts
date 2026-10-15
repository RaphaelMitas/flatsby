import { describe, expect, it } from "vitest";

import { inviteCodeSchema, safeRedirectPath } from "./invite";

describe("safeRedirectPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirectPath("/join/K7Q4M2XP")).toBe("/join/K7Q4M2XP");
  });

  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "https://evil.com",
    "",
    undefined,
  ])("rejects %j", (path) => {
    expect(safeRedirectPath(path)).toBe("/");
  });
});

describe("inviteCodeSchema", () => {
  it("reads look-alikes, case, the dash and pasted links", () => {
    expect(inviteCodeSchema.parse("k7q4-m2xp")).toBe("K7Q4M2XP");
    expect(inviteCodeSchema.parse("O1IL-ABCD")).toBe("0111ABCD");
    expect(
      inviteCodeSchema.parse("https://www.flatsby.com/join/K7Q4-M2XP"),
    ).toBe("K7Q4M2XP");
  });

  it("rejects short codes and letters outside the alphabet", () => {
    expect(inviteCodeSchema.safeParse("K7Q4").success).toBe(false);
    expect(inviteCodeSchema.safeParse("UUUUUUUU").success).toBe(false);
  });
});
