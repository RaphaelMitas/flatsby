import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { isLocale, localeCookie } from "@flatsby/i18n/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import { parsePalette } from "@flatsby/validators/palette";

import { paletteCookie } from "~/app/_components/layout/palette";
import { SupportFlatsby } from "~/app/_components/SupportFlatsby";
import {
  getCurrentUserWithGroups,
  HydrateClient,
  prefetch,
  trpc,
} from "~/trpc/server";
import { AnalyticsSettings } from "./AnalyticsSettings";
import { AppearanceSettings } from "./AppearanceSettings";
import DeleteUser from "./DeleteUser";
import ExportUserData from "./ExportUserData";
import { LanguageSettings } from "./LanguageSettings";
import ManageUser from "./ManageUser";
import Passkeys from "./Passkeys";
import { PaypalHandleCard } from "./PaypalHandleCard";

export default async function Page() {
  await getCurrentUserWithGroups();
  prefetch(trpc.user.getCurrentUser.queryOptions());
  const t = await getTranslations("settings.page");
  const cookieStore = await cookies();
  const preference = cookieStore.get(localeCookie)?.value;
  const palette = parsePalette(cookieStore.get(paletteCookie)?.value ?? null);
  return (
    <HydrateClient>
      <div className="flex flex-col p-4 md:pt-16">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 lg:grid-cols-[1fr]">
          <div className="mx-auto grid w-full max-w-6xl gap-2">
            <h1
              className="text-3xl font-semibold"
              data-testid="account-settings-title"
            >
              {t("title")}
            </h1>
          </div>
          <ManageUser />
          <PaypalHandleCard />
          <Passkeys />
          <LanguageSettings
            preference={preference && isLocale(preference) ? preference : null}
          />
          <AppearanceSettings palette={palette} />
          <AnalyticsSettings />
          <SupportFlatsby />
          <Card>
            <CardHeader>
              <CardTitle>{t("dataTitle")}</CardTitle>
              <CardDescription>{t("dataDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ExportUserData />
            </CardContent>
          </Card>
          <DeleteUser />
        </div>
      </div>
    </HydrateClient>
  );
}
