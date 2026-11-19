"use client";

import { useEffect } from "react";

import { parsePalette } from "@flatsby/validators/palette";

import { applyPalette, readStoredPalette } from "./palette";

export function PaletteSync() {
  useEffect(() => {
    applyPalette(parsePalette(readStoredPalette()));
  }, []);

  return null;
}
