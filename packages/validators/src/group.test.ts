import { describe, expect, it } from "vitest";

import { openPlaceholders } from "./group";

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
