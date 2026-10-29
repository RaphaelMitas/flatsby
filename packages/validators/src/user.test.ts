import { describe, expect, it } from "vitest";

import { asksForName, defaultUserName } from "./user";

const createdAt = new Date("2026-10-29T10:00:00Z");
const signedIn = (name: string, sessionAfterMs: number) => ({
  session: { createdAt: new Date(createdAt.getTime() + sessionAfterMs) },
  user: { name, email: "mia@posteo.de", createdAt },
});

describe("asksForName", () => {
  it("asks a fresh account that still has the address as its name", () => {
    expect(asksForName(signedIn(defaultUserName("mia@posteo.de"), 50))).toBe(
      true,
    );
  });

  it("leaves a fresh account alone when a provider gave it a name", () => {
    expect(asksForName(signedIn("Mia Müller", 50))).toBe(false);
  });

  it("leaves an existing account alone on a later sign-in", () => {
    expect(asksForName(signedIn("mia", 24 * 60 * 60 * 1000))).toBe(false);
  });
});
