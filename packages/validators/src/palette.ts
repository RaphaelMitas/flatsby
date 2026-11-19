import { z } from "zod/v4";

export const palettePresetIds = [
  "default",
  "sand",
  "forest",
  "ocean",
  "blossom",
] as const;
export type PalettePresetId = (typeof palettePresetIds)[number];

export const paletteIds = [...palettePresetIds, "custom"] as const;
export type PaletteId = (typeof paletteIds)[number];

export const HUE_MAX = 360;

export const paletteSchema = z.object({
  id: z.enum(paletteIds),
  hue: z.number().min(0).max(HUE_MAX),
  tint: z.number().min(0).max(1),
});
export type Palette = z.infer<typeof paletteSchema>;

export const defaultPalette: Palette = { id: "default", hue: 300, tint: 0.5 };

export function parsePalette(stored: string | null): Palette {
  if (!stored) return defaultPalette;
  try {
    return paletteSchema.parse(JSON.parse(stored));
  } catch {
    return defaultPalette;
  }
}

export type ColorMode = "light" | "dark";

export const paletteTokenNames = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "input",
  "ring",
  "cat-detail",
  "sidebar",
  "sidebar-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;
export type PaletteTokenName = (typeof paletteTokenNames)[number];
export type PaletteTokens = Record<PaletteTokenName, string>;

const defaultTokens: Record<ColorMode, PaletteTokens> = {
  light: {
    background: "#ffffff",
    foreground: "#09090b",
    card: "#ffffff",
    "card-foreground": "#09090b",
    popover: "#ffffff",
    "popover-foreground": "#09090b",
    primary: "#18181b",
    "primary-foreground": "#fafafa",
    secondary: "#f4f4f5",
    "secondary-foreground": "#18181b",
    muted: "#f4f4f5",
    "muted-foreground": "#71717a",
    accent: "#f4f4f5",
    "accent-foreground": "#18181b",
    border: "#e4e4e7",
    input: "#e4e4e7",
    ring: "#18181b",
    "cat-detail": "#ffffff",
    sidebar: "#fafafa",
    "sidebar-foreground": "#3f3f46",
    "sidebar-accent": "#f4f4f5",
    "sidebar-accent-foreground": "#18181b",
    "sidebar-border": "#e5e7eb",
    "sidebar-ring": "#3b82f6",
  },
  dark: {
    background: "#09090b",
    foreground: "#fafafa",
    card: "#09090b",
    "card-foreground": "#fafafa",
    popover: "#09090b",
    "popover-foreground": "#fafafa",
    primary: "#fafafa",
    "primary-foreground": "#18181b",
    secondary: "#27272a",
    "secondary-foreground": "#fafafa",
    muted: "#27272a",
    "muted-foreground": "#a1a1aa",
    accent: "#27272a",
    "accent-foreground": "#fafafa",
    border: "#27272a",
    input: "#27272a",
    ring: "#d4d4d8",
    "cat-detail": "#000000",
    sidebar: "#18181b",
    "sidebar-foreground": "#f4f4f5",
    "sidebar-accent": "#27272a",
    "sidebar-accent-foreground": "#f4f4f5",
    "sidebar-border": "#27272a",
    "sidebar-ring": "#3b82f6",
  },
};

type Oklch = readonly [lightness: number, chroma: number, hue: number];
type Accent = Record<ColorMode, { fill: Oklch; text: Oklch }>;

const WHITE: Oklch = [1, 0, 0];

function hueAccent(hue: number): Accent {
  return {
    light: { fill: [0.5, 0.15, hue], text: WHITE },
    dark: { fill: [0.8, 0.11, hue], text: [0.2, 0.04, hue] },
  };
}

const PRESET_TINT = 0.4;

const presets: Record<
  Exclude<PalettePresetId, "default">,
  { hue: number; accent: Accent }
> = {
  sand: {
    hue: 70,
    accent: {
      light: { fill: [0.52, 0.13, 45], text: WHITE },
      dark: { fill: [0.8, 0.11, 60], text: [0.2, 0.04, 60] },
    },
  },
  forest: {
    hue: 155,
    accent: {
      light: { fill: [0.44, 0.09, 155], text: WHITE },
      dark: { fill: [0.8, 0.12, 155], text: [0.2, 0.04, 155] },
    },
  },
  ocean: {
    hue: 255,
    accent: {
      light: { fill: [0.5, 0.17, 258], text: WHITE },
      dark: { fill: [0.78, 0.11, 250], text: [0.2, 0.04, 250] },
    },
  },
  blossom: {
    hue: 0,
    accent: {
      light: { fill: [0.53, 0.19, 5], text: WHITE },
      dark: { fill: [0.8, 0.11, 355], text: [0.2, 0.04, 355] },
    },
  },
};

function linearSrgb([lightness, chroma, hue]: Oklch) {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const GAMUT_SLACK = 0.0001;

function inSrgb(channels: number[]) {
  return channels.every(
    (channel) => channel >= -GAMUT_SLACK && channel <= 1 + GAMUT_SLACK,
  );
}

function chromaInSrgb([lightness, chroma, hue]: Oklch) {
  if (inSrgb(linearSrgb([lightness, chroma, hue]))) return chroma;
  let low = 0;
  let high = chroma;
  for (let step = 0; step < 20; step++) {
    const middle = (low + high) / 2;
    if (inSrgb(linearSrgb([lightness, middle, hue]))) low = middle;
    else high = middle;
  }
  return low;
}

function hexChannel(linear: number) {
  const clamped = Math.min(1, Math.max(0, linear));
  const encoded =
    clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(encoded * 255)
    .toString(16)
    .padStart(2, "0");
}

function oklchToHex(color: Oklch): string {
  const [lightness, , hue] = color;
  const channels = linearSrgb([lightness, chromaInSrgb(color), hue]);
  return `#${channels.map(hexChannel).join("")}`;
}

function derivedTokens(
  hue: number,
  tint: number,
  accent: Accent,
  mode: ColorMode,
): PaletteTokens {
  const at = (lightness: number, chroma: number) =>
    oklchToHex([lightness, chroma, hue]);
  const surfaces =
    mode === "light"
      ? {
          background: at(1 - 0.03 * tint, 0.014 * tint),
          card: at(1 - 0.008 * tint, 0.007 * tint),
          foreground: at(0.16, 0.005 + 0.025 * tint),
          mutedForeground: at(0.51, 0.014 + 0.012 * tint),
          muted: at(0.967 - 0.03 * tint, 0.002 + 0.02 * tint),
          border: at(0.92 - 0.035 * tint, 0.004 + 0.02 * tint),
          sidebar: at(0.985 - 0.03 * tint, 0.002 + 0.014 * tint),
        }
      : {
          background: at(0.141 + 0.03 * tint, 0.005 + 0.018 * tint),
          card: at(0.141 + 0.065 * tint, 0.005 + 0.02 * tint),
          foreground: at(0.985, 0.012 * tint),
          mutedForeground: at(0.72, 0.014 + 0.012 * tint),
          muted: at(0.274 + 0.01 * tint, 0.006 + 0.02 * tint),
          border: at(0.274 + 0.03 * tint, 0.006 + 0.02 * tint),
          sidebar: at(0.21 + 0.03 * tint, 0.006 + 0.02 * tint),
        };
  const primary = oklchToHex(accent[mode].fill);
  const primaryForeground = oklchToHex(accent[mode].text);

  return {
    background: surfaces.background,
    foreground: surfaces.foreground,
    card: surfaces.card,
    "card-foreground": surfaces.foreground,
    popover: surfaces.card,
    "popover-foreground": surfaces.foreground,
    primary,
    "primary-foreground": primaryForeground,
    secondary: surfaces.muted,
    "secondary-foreground": surfaces.foreground,
    muted: surfaces.muted,
    "muted-foreground": surfaces.mutedForeground,
    accent: surfaces.muted,
    "accent-foreground": surfaces.foreground,
    border: surfaces.border,
    input: surfaces.border,
    ring: primary,
    "cat-detail": primaryForeground,
    sidebar: surfaces.sidebar,
    "sidebar-foreground": surfaces.foreground,
    "sidebar-accent": surfaces.muted,
    "sidebar-accent-foreground": surfaces.foreground,
    "sidebar-border": surfaces.border,
    "sidebar-ring": primary,
  };
}

export function paletteTokens(
  palette: Palette,
  mode: ColorMode,
): PaletteTokens {
  if (palette.id === "default") return defaultTokens[mode];
  if (palette.id === "custom") {
    return derivedTokens(
      palette.hue,
      palette.tint,
      hueAccent(palette.hue),
      mode,
    );
  }
  const preset = presets[palette.id];
  return derivedTokens(preset.hue, PRESET_TINT, preset.accent, mode);
}

const HUE_SCALE_STEP = 30;

export function accentScale(mode: ColorMode): [string, string, ...string[]] {
  const at = (hue: number) => oklchToHex(hueAccent(hue)[mode].fill);
  return [
    at(0),
    at(HUE_SCALE_STEP),
    ...Array.from({ length: HUE_MAX / HUE_SCALE_STEP - 1 }, (_, step) =>
      at((step + 2) * HUE_SCALE_STEP),
    ),
  ];
}

function cssDeclarations(tokens: PaletteTokens) {
  return paletteTokenNames.map((name) => `--${name}:${tokens[name]}`).join(";");
}

export function paletteCss(palette: Palette): string {
  if (palette.id === "default") return "";
  const light = cssDeclarations(paletteTokens(palette, "light"));
  const dark = cssDeclarations(paletteTokens(palette, "dark"));
  return `html:root{${light}}html.dark{${dark}}`;
}
