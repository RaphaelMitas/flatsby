import { describe, expect, it } from "vitest";

import {
  girocodePayload,
  ibanSchema,
  isValidIban,
  parsePaypalHandle,
  paymentDetailsFormSchema,
  paymentOptions,
  paypalMeUrl,
  settlementReference,
} from "./payment";

describe("isValidIban", () => {
  it.each([
    "DE89370400440532013000",
    "AT611904300234573201",
    "FR1420041010050500013M02606",
    "GB82WEST12345698765432",
  ])("accepts %s", (iban) => {
    expect(isValidIban(iban)).toBe(true);
  });

  it.each([
    ["one wrong digit", "DE89370400440532013001"],
    ["two digits swapped", "DE89370400440532010300"],
    ["a dropped digit", "DE8937040044053201300"],
    ["no country", "8937040044053201300012"],
  ])("rejects %s", (_, iban) => {
    expect(isValidIban(iban)).toBe(false);
  });

  it("reads spaces and lower case", () => {
    expect(ibanSchema.parse("de89 3704 0044 0532 0130 00")).toBe(
      "DE89370400440532013000",
    );
  });
});

describe("parsePaypalHandle", () => {
  it.each([
    "ruffy",
    "@ruffy",
    "paypal.me/ruffy",
    "https://www.paypal.me/ruffy/12EUR",
    "https://www.paypal.com/paypalme/ruffy",
  ])("reads %s", (value) => {
    expect(parsePaypalHandle(value)).toBe("ruffy");
  });

  it("rejects other links", () => {
    expect(parsePaypalHandle("https://example.com/ruffy")).toBeNull();
  });
});

describe("paymentDetailsFormSchema", () => {
  it("needs an account holder once there is an IBAN", () => {
    const result = paymentDetailsFormSchema.safeParse({
      accountHolder: " ",
      iban: "DE89370400440532013000",
      paypalHandle: "",
    });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["accountHolder"],
    ]);
  });

  it("allows only a PayPal name", () => {
    expect(
      paymentDetailsFormSchema.safeParse({
        accountHolder: "",
        iban: "",
        paypalHandle: "ruffy",
      }).success,
    ).toBe(true);
  });
});

describe("girocodePayload", () => {
  it("follows EPC069-12 version 002 with an empty BIC", () => {
    expect(
      girocodePayload({
        accountHolder: "Lena Schneider",
        iban: "DE89370400440532013000",
        amountInCents: 3050,
        reference: "Flatsby WG Sonnenallee",
      }),
    ).toBe(
      "BCD\n002\n1\nSCT\n\nLena Schneider\nDE89370400440532013000\nEUR30.50\n\n\nFlatsby WG Sonnenallee",
    );
  });

  it("stays within 331 bytes at every field's limit", () => {
    const payload = girocodePayload({
      accountHolder: "Ü".repeat(70),
      iban: `MT${"9".repeat(29)}`,
      amountInCents: 99_999_999_999,
      reference: settlementReference("W".repeat(200)),
    });
    expect(new TextEncoder().encode(payload).length).toBeLessThanOrEqual(331);
  });
});

describe("settlementReference", () => {
  it("keeps to the SEPA basic Latin set", () => {
    expect(settlementReference("Küche & Bad 🏠 Straße")).toBe(
      "Flatsby Kueche Bad Strasse",
    );
  });
});

describe("paymentOptions", () => {
  const details = {
    accountHolder: "Lena Schneider",
    iban: "DE89370400440532013000",
    paypalHandle: "lenaschn",
  };

  it("offers the code for euro to an EEA account", () => {
    expect(paymentOptions(details, "EUR").bank?.girocode).toBe(true);
  });

  it("offers no bank transfer outside euro", () => {
    expect(paymentOptions(details, "USD")).toEqual({
      bank: null,
      paypalHandle: "lenaschn",
      euroOnly: true,
    });
  });

  it("offers no code to an account outside the EEA", () => {
    const swiss = { ...details, iban: "CH9300762011623852957" };
    expect(paymentOptions(swiss, "EUR").bank?.girocode).toBe(false);
  });
});

describe("paypalMeUrl", () => {
  it("puts the amount and currency after the handle", () => {
    expect(paypalMeUrl("lenaschn", 1500, "USD")).toBe(
      "https://paypal.me/lenaschn/15.00USD",
    );
  });
});
