import { describe, expect, it } from "vitest";

import { asksForName } from "./user";

const createdAt = new Date("2026-10-29T10:00:00Z");
const user = (name: string) => ({ name, email: "mia@posteo.de", createdAt });

describe("asksForName", () => {
  it("asks an account that was just created with the address as its name", () => {
    expect(asksForName(user("mia"), createdAt.getTime() + 2000)).toBe(true);
  });

  it("leaves a new account alone when a provider gave it a name", () => {
    expect(asksForName(user("Mia Müller"), createdAt.getTime() + 2000)).toBe(
      false,
    );
  });

  it("leaves an older account alone on a later sign-in", () => {
    expect(
      asksForName(user("mia"), createdAt.getTime() + 24 * 60 * 60 * 1000),
    ).toBe(false);
  });
});
