import type { Palette } from "@flatsby/validators/palette";

import { paletteCss } from "@flatsby/validators/palette";

const PALETTE_KEY = "palette";
const PALETTE_CSS_KEY = "palette_css";
const PALETTE_STYLE_ID = "palette";

export const paletteScript = `try{var c=localStorage.getItem("${PALETTE_CSS_KEY}");if(c){var s=document.createElement("style");s.id="${PALETTE_STYLE_ID}";s.textContent=c;document.head.appendChild(s)}}catch(e){}`;

const listeners = new Set<() => void>();

export function subscribeToPalette(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const readStoredPalette = () => localStorage.getItem(PALETTE_KEY);

function paletteStyle() {
  const existing = document.getElementById(PALETTE_STYLE_ID);
  if (existing) return existing;
  const style = document.createElement("style");
  style.id = PALETTE_STYLE_ID;
  document.head.appendChild(style);
  return style;
}

export function applyPalette(palette: Palette) {
  const css = paletteCss(palette);
  paletteStyle().textContent = css;
  localStorage.setItem(PALETTE_CSS_KEY, css);
}

export function savePalette(palette: Palette) {
  localStorage.setItem(PALETTE_KEY, JSON.stringify(palette));
  applyPalette(palette);
  for (const listener of listeners) listener();
}
