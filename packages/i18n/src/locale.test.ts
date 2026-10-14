import { describe, expect, it } from "vitest";

import { localeFromHeaders } from "./locale";

const headers = (entries: Record<string, string>) => ({
  get: (name: string) => entries[name] ?? null,
});

describe("localeFromHeaders", () => {
  it("picks the first supported browser language", () => {
    expect(
      localeFromHeaders(
        headers({ "accept-language": "fr-FR,de-CH;q=0.8,en;q=0.5" }),
      ),
    ).toBe("de");
  });

  it("falls back to English", () => {
    expect(localeFromHeaders(headers({ "accept-language": "fr" }))).toBe("en");
    expect(localeFromHeaders(headers({}))).toBe("en");
  });

  it("prefers the saved choice over the browser", () => {
    expect(
      localeFromHeaders(
        headers({
          "accept-language": "de-DE",
          cookie: "theme=dark; locale=en",
        }),
      ),
    ).toBe("en");
  });
});
