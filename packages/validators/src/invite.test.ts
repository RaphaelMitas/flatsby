import { describe, expect, it } from "vitest";

import {
  inviteCodeSchema,
  invitePath,
  outlivesAnyInvite,
  parsePlaceholderId,
  safeRedirectPath,
} from "./invite";

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
    expect(safeRedirectPath(path)).toBe("/home");
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

describe("outlivesAnyInvite", () => {
  it("only lets installs younger than an invite's lifetime read the referrer", () => {
    const day = 86_400_000;
    expect(outlivesAnyInvite(new Date(Date.now() - 3 * day))).toBe(false);
    expect(outlivesAnyInvite(new Date(Date.now() - 30 * day))).toBe(true);
  });
});

describe("invitePath", () => {
  it("carries a placeholder id that reads back after the round trip", () => {
    const path = invitePath("K7Q4M2XP", 41);
    expect(path).toBe("/join/K7Q4M2XP?p=41");
    expect(safeRedirectPath(path)).toBe(path);
    expect(
      parsePlaceholderId(new URL(path, "https://x.test").searchParams.get("p")),
    ).toBe(41);
    expect(inviteCodeSchema.parse(`https://x.test${path}`)).toBe("K7Q4M2XP");
  });

  it.each([null, undefined, "", "abc", "-3", "1.5"])(
    "ignores the junk id %j",
    (value) => {
      expect(parsePlaceholderId(value)).toBeUndefined();
    },
  );
});
