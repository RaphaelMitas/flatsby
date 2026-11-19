import type { Palette } from "@flatsby/validators/palette";

import { paletteCss } from "@flatsby/validators/palette";

export const paletteCookie = "palette";
export const PALETTE_STYLE_ID = "palette";

const PALETTE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const rootPaletteCss = (palette: Palette) =>
  palette.id === "default"
    ? ""
    : paletteCss(palette, { light: "html:root", dark: "html.dark" });

export function savePalette(palette: Palette) {
  const style = document.getElementById(PALETTE_STYLE_ID);
  if (style) style.textContent = rootPaletteCss(palette);
  document.cookie = `${paletteCookie}=${encodeURIComponent(JSON.stringify(palette))}; path=/; max-age=${PALETTE_COOKIE_MAX_AGE}`;
}
