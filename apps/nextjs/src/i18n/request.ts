import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { localeCookie, resolveLocale } from "@flatsby/i18n/locale";
import { messages } from "@flatsby/i18n/messages";

// cookies() sees a preference a Server Action just set; the raw header does not.
export default getRequestConfig(async () => {
  const locale = resolveLocale(
    (await cookies()).get(localeCookie)?.value,
    (await headers()).get("accept-language"),
  );
  return { locale, messages: messages[locale] };
});
