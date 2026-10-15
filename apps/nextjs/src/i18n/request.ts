import { cookies, headers } from "next/headers";
import { locale as routeLocale } from "next/root-params";
import { getRequestConfig } from "next-intl/server";

import { isLocale, localeCookie, resolveLocale } from "@flatsby/i18n/locale";
import { messages } from "@flatsby/i18n/messages";

// Root params throw in Server Actions and Route Handlers; only app routes use those.
async function marketingLocale() {
  try {
    return await routeLocale();
  } catch {
    return undefined;
  }
}

// Marketing pages take the locale from their URL so they stay static.
// cookies() sees a preference a Server Action just set; the raw header does not.
export default getRequestConfig(async ({ locale: requested }) => {
  const fromRoute = requested ?? (await marketingLocale());
  const locale =
    typeof fromRoute === "string" && isLocale(fromRoute)
      ? fromRoute
      : resolveLocale(
          (await cookies()).get(localeCookie)?.value,
          (await headers()).get("accept-language"),
        );
  return { locale, messages: messages[locale] };
});
