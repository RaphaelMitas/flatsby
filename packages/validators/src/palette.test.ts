import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { ColorMode, Palette, PaletteTokenName } from "./palette";
import {
  defaultPalette,
  HUE_MAX,
  palettePresetIds,
  paletteTokenNames,
  paletteTokens,
  parsePalette,
} from "./palette";

const modes: ColorMode[] = ["light", "dark"];

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const amplitude = s * Math.min(l, 1 - l);
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;
    const value = l - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function themeCssTokens(mode: ColorMode) {
  const css = readFileSync(
    new URL("../../../tooling/tailwind/theme.css", import.meta.url),
    "utf8",
  );
  const [light = "", rest = ""] = css.split("@variant dark {");
  const block = mode === "light" ? light : rest.slice(0, rest.indexOf("}"));
  return Object.fromEntries(
    paletteTokenNames.map((name) => {
      const match = new RegExp(
        `--${name}: hsl\\(([\\d.]+) ([\\d.]+)% ([\\d.]+)%\\)`,
      ).exec(block);
      if (!match) throw new Error(`theme.css has no ${mode} --${name}`);
      const [hue, saturation, lightness] = match.slice(1).map(Number);
      return [name, hslToHex(hue ?? 0, saturation ?? 0, lightness ?? 0)];
    }),
  );
}

function luminance(hex: string) {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string) {
  const [lighter = 0, darker = 0] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const readablePairs: [PaletteTokenName, PaletteTokenName, number][] = [
  ["primary-foreground", "primary", 4.5],
  ["primary", "background", 3],
  ["primary", "card", 3],
  ["foreground", "background", 4.5],
  ["foreground", "card", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "card", 4.5],
  ["muted-foreground", "muted", 4.5],
];

function unreadablePairs(palette: Palette) {
  return modes.flatMap((mode) => {
    const tokens = paletteTokens(palette, mode);
    return readablePairs
      .filter(
        ([text, surface, minimum]) =>
          contrast(tokens[text], tokens[surface]) < minimum,
      )
      .map(
        ([text, surface]) =>
          `${palette.id} ${palette.hue}/${palette.tint} ${mode}: ${text} on ${surface}`,
      );
  });
}

describe("paletteTokens", () => {
  it.each(modes)(
    "keeps the default palette equal to theme.css in %s",
    (mode) => {
      expect(paletteTokens(defaultPalette, mode)).toEqual(themeCssTokens(mode));
    },
  );

  it("keeps text readable in every preset", () => {
    const failures = palettePresetIds
      .filter((id) => id !== "default")
      .flatMap((id) => unreadablePairs({ ...defaultPalette, id }));

    expect(failures).toEqual([]);
  });

  it("keeps text readable at every custom hue and tint", () => {
    const failures = Array.from({ length: HUE_MAX }, (_, hue) => hue).flatMap(
      (hue) =>
        [0, 0.2, 0.4, 0.7, 1].flatMap((tint) =>
          unreadablePairs({ id: "custom", hue, tint }),
        ),
    );

    expect(failures).toEqual([]);
  });
});

describe("parsePalette", () => {
  it("falls back to the default palette when the stored value is not one", () => {
    expect(parsePalette(null)).toEqual(defaultPalette);
    expect(parsePalette("{")).toEqual(defaultPalette);
    expect(parsePalette('{"id":"neon","hue":10,"tint":0.2}')).toEqual(
      defaultPalette,
    );
    expect(parsePalette('{"id":"custom","hue":120,"tint":0.3}')).toEqual({
      id: "custom",
      hue: 120,
      tint: 0.3,
    });
  });
});
