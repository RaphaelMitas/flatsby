import { describe, expect, it } from "vitest";

import {
  createPinSchema,
  pinContentOf,
  pinFormOf,
  pinFormSchema,
  wifiFromQrText,
  wifiQrText,
} from "./pinboard";

describe("wifiQrText", () => {
  it("escapes the characters the format reserves", () => {
    expect(wifiQrText({ ssid: 'Cafe; "Zum:Eck"', password: "a\\b,c" })).toBe(
      'WIFI:T:WPA;S:Cafe\\; \\"Zum\\:Eck\\";P:a\\\\b\\,c;;',
    );
  });

  it("marks a network without a password as open", () => {
    expect(wifiQrText({ ssid: "Guest", password: "" })).toBe(
      "WIFI:T:nopass;S:Guest;;",
    );
  });
});

describe("wifiFromQrText", () => {
  it.each([
    { ssid: "FRITZ!Box 7590 KL", password: "48291173005622918830" },
    { ssid: 'Cafe; "Zum:Eck"', password: "a\\b,c;d:e" },
    { ssid: "Guest", password: "" },
  ])("reads back what wifiQrText wrote for $ssid", (wifi) => {
    expect(wifiFromQrText(wifiQrText(wifi))).toEqual(wifi);
  });

  it("reads a code with the fields in the order Android writes them", () => {
    expect(
      wifiFromQrText("WIFI:S:WG Darmstadt;T:WPA;P:hafer\\;flocken;H:false;;"),
    ).toEqual({ ssid: "WG Darmstadt", password: "hafer;flocken" });
  });

  it.each(["https://www.flatsby.com", "WIFI:T:WPA;P:secret;;", ""])(
    "refuses %j",
    (text) => {
      expect(wifiFromQrText(text)).toBeNull();
    },
  );
});

describe("pin form", () => {
  const form = pinFormOf({ title: "WiFi", icon: "wifi" });

  it("needs a text unless the network name is filled", () => {
    expect(pinFormSchema.safeParse(form).success).toBe(false);
    expect(pinFormSchema.safeParse({ ...form, ssid: "Home" }).success).toBe(
      true,
    );
  });

  it("drops the network when another icon is picked", () => {
    const content = pinContentOf({
      ...form,
      icon: "pin",
      body: "Router is in the hallway",
      ssid: "Home",
      password: "secret",
    });
    expect(content.wifi).toBeNull();
    expect(createPinSchema.safeParse({ ...content, groupId: 1 }).success).toBe(
      true,
    );
  });
});
