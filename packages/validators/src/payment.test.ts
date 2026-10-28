import { describe, expect, it } from "vitest";

import {
  girocodePayload,
  ibanSchema,
  isValidIban,
  parsePaypalHandle,
  paymentDetailsFormSchema,
  paymentDetailsInput,
  paymentOptions,
  settlementReference,
  settlePaymentView,
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
    "https://paypal.me/ruffy?country.x=DE&locale.x=de_DE",
  ])("reads %s", (value) => {
    expect(parsePaypalHandle(value)).toBe("ruffy");
  });

  it("rejects other links", () => {
    expect(parsePaypalHandle("https://example.com/ruffy")).toBeNull();
  });
});

describe("paymentDetailsFormSchema", () => {
  it("rejects a line separator in the account holder", () => {
    const result = paymentDetailsFormSchema.safeParse({
      accountHolder: "Lena\u2028DE89370400440532013000",
      iban: "DE89370400440532013000",
      paypalHandle: "",
    });
    expect(result.success).toBe(false);
  });

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

  it("cuts the reference to stay within 331 bytes", () => {
    const payload = girocodePayload({
      accountHolder: "€".repeat(70),
      iban: `MT${"9".repeat(32)}`,
      amountInCents: 99_999_999_999,
      reference: settlementReference("W".repeat(200)),
    });
    expect(payload?.startsWith("BCD\n002")).toBe(true);
    expect(new TextEncoder().encode(payload ?? "").length).toBeLessThanOrEqual(
      331,
    );
  });

  it("gives no code for an amount EPC069-12 can't carry", () => {
    const fields = {
      accountHolder: "Lena Schneider",
      iban: "DE89370400440532013000",
      reference: "Flatsby",
    };
    expect(girocodePayload({ ...fields, amountInCents: 0 })).toBeNull();
    expect(
      girocodePayload({ ...fields, amountInCents: 100_000_000_000 }),
    ).toBeNull();
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
      payable: true,
      euroOnly: true,
    });
  });

  it("offers no code to an account outside the EEA", () => {
    const swiss = { ...details, iban: "CH9300762011623852957" };
    expect(paymentOptions(swiss, "EUR").bank?.girocode).toBe(false);
  });
});

describe("paymentDetailsInput", () => {
  const values = {
    accountHolder: "Ruffy",
    iban: "",
    paypalHandle: "ruffy",
  };

  it("leaves fields it didn't edit to what's stored", () => {
    expect(paymentDetailsInput(values, { paypalHandle: true })).toEqual({
      paypalHandle: "ruffy",
    });
  });

  it("sends no account holder without an IBAN", () => {
    expect(paymentDetailsInput(values, { accountHolder: true })).toEqual({});
  });

  it("clears the account holder along with the IBAN", () => {
    expect(paymentDetailsInput(values, { iban: true })).toEqual({
      iban: null,
      accountHolder: null,
    });
  });
});

describe("settlePaymentView", () => {
  const ibanOnly = {
    accountHolder: "Ruffy",
    iban: "DE89370400440532013000",
    paypalHandle: null,
  };
  const paypalOnly = { accountHolder: null, iban: null, paypalHandle: "max" };
  const view = (
    details: typeof ibanOnly | typeof paypalOnly,
    currency: string,
    amountInCents: number,
    receiverIsMe: boolean,
  ) =>
    settlePaymentView(paymentOptions(details, currency), {
      amountInCents,
      currency,
      groupName: "WG",
      receiverIsMe,
    });

  it("doesn't ask a receiver with an IBAN to add one on a non-euro debt", () => {
    expect(view(ibanOnly, "USD", 1500, true).kind).toBe("hidden");
  });

  it("shows the receiver their own code for a euro debt", () => {
    expect(view(ibanOnly, "EUR", 1500, true).kind).toBe("ownCode");
  });

  it("puts the amount and currency after the PayPal handle", () => {
    const pay = view(paypalOnly, "USD", 1500, false);
    expect(pay.kind === "pay" && pay.paypalUrl).toBe(
      "https://paypal.me/max/15.00USD",
    );
  });

  it("offers no PayPal link before there is an amount", () => {
    const pay = view(paypalOnly, "USD", 0, false);
    expect(pay.kind === "pay" && pay.paypalUrl).toBeNull();
  });
});
