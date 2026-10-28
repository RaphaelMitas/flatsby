import { describe, expect, it } from "vitest";

import {
  parsePaypalHandle,
  paypalMeUrl,
  updatePaypalHandleInputSchema,
} from "./payment";

describe("parsePaypalHandle", () => {
  it.each([
    "ruffy",
    "@ruffy",
    "paypal.me/ruffy",
    "https://www.paypal.me/ruffy/12EUR",
    "https://www.paypal.com/paypalme/ruffy",
    "https://paypal.me/ruffy?country.x=DE&locale.x=de_DE",
  ])("reads %s", (value) => {
    expect(parsePaypalHandle(value)).toBe("ruffy");
  });

  it("rejects other links", () => {
    expect(parsePaypalHandle("https://example.com/ruffy")).toBeNull();
  });
});

describe("updatePaypalHandleInputSchema", () => {
  it("stores the handle out of a pasted link", () => {
    expect(
      updatePaypalHandleInputSchema.parse({
        paypalHandle: "https://paypal.me/ruffy",
      }),
    ).toEqual({ paypalHandle: "ruffy" });
  });

  it("rejects what isn't a PayPal.me name", () => {
    expect(
      updatePaypalHandleInputSchema.safeParse({ paypalHandle: "not a name" })
        .success,
    ).toBe(false);
  });
});

describe("paypalMeUrl", () => {
  it("puts the amount and currency after the handle", () => {
    expect(paypalMeUrl("max", 1500, "USD")).toBe(
      "https://paypal.me/max/15.00USD",
    );
  });

  it("offers no link before there is an amount", () => {
    expect(paypalMeUrl("max", 0, "EUR")).toBeNull();
  });
});
