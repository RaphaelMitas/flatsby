"use server";

import { cookies } from "next/headers";

import { isLocale, localeCookie } from "@flatsby/i18n/locale";

export async function setLocalePreference(preference: string) {
  const store = await cookies();
  if (isLocale(preference)) {
    store.set(localeCookie, preference, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  } else {
    store.delete(localeCookie);
  }
}
