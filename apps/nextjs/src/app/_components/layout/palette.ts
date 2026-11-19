import type { Palette } from "@flatsby/validators/palette";

import { paletteCss } from "@flatsby/validators/palette";

export const paletteCookie = "palette";
export const PALETTE_STYLE_ID = "palette";

export const rootPaletteCss = (palette: Palette) =>
  palette.id === "default"
    ? ""
    : paletteCss(palette, { light: "html:root", dark: "html.dark" });

export function applyPalette(palette: Palette) {
  const style = document.getElementById(PALETTE_STYLE_ID);
  if (style) style.textContent = rootPaletteCss(palette);
}
