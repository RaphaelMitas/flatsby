import { describe, expect, it } from "vitest";

import { openPlaceholders, splitFlatmateNames } from "./group";

describe("splitFlatmateNames", () => {
  it.each([
    "Lena, Tim",
    "Lena und Tim",
    "lena and Tim",
    "Lena & Tim, lena",
    "Lena, und Tim",
  ])("reads %j as two flatmates", (raw) => {
    expect(splitFlatmateNames(raw).map((name) => name.toLowerCase())).toEqual([
      "lena",
      "tim",
    ]);
  });

  it("keeps a name that only contains the word", () => {
    expect(splitFlatmateNames("Gundula")).toEqual(["Gundula"]);
  });
});

describe("openPlaceholders", () => {
  it("leaves out joined members and placeholders that are still saving", () => {
    const member = (id: number, userId: string | null, name: string) => ({
      id,
      userId,
      user: { name },
    });
    expect(
      openPlaceholders([
        member(1, "u1", "Ruffy"),
        member(2, null, "Lena"),
        member(-1, null, "Tim"),
      ]),
    ).toEqual([{ id: 2, name: "Lena" }]);
  });
});
