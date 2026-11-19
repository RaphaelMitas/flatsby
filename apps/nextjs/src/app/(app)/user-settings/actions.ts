"use server";

import type { Palette } from "@flatsby/validators/palette";
import { cookies } from "next/headers";

import { isLocale, localeCookie } from "@flatsby/i18n/locale";
import { paletteCookie, paletteSchema } from "@flatsby/validators/palette";

const preferenceCookie = { maxAge: 60 * 60 * 24 * 365, path: "/" };

export async function setLocalePreference(preference: string) {
  const store = await cookies();
  if (isLocale(preference)) {
    store.set(localeCookie, preference, preferenceCookie);
  } else {
    store.delete(localeCookie);
  }
}

export async function setPalettePreference(palette: Palette) {
  const store = await cookies();
  store.set(
    paletteCookie,
    JSON.stringify(paletteSchema.parse(palette)),
    preferenceCookie,
  );
}
