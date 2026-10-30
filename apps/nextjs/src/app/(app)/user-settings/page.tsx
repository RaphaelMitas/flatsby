import { cookies } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { isLocale, localeCookie } from "@flatsby/i18n/locale";
import { Button } from "@flatsby/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";

import { prefetch, trpc } from "~/trpc/server";
import DeleteUser from "./DeleteUser";
import ExportUserData from "./ExportUserData";
import { LanguageSettings } from "./LanguageSettings";
import ManageUser from "./ManageUser";
import { PaypalHandleCard } from "./PaypalHandleCard";

export default async function Page() {
  prefetch(trpc.user.getCurrentUser.queryOptions());
  const t = await getTranslations("settings.page");
  const preference = (await cookies()).get(localeCookie)?.value;
  return (
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
        <LanguageSettings
          preference={preference && isLocale(preference) ? preference : null}
        />
        <Card>
          <CardHeader>
            <CardTitle>{t("billingTitle")}</CardTitle>
            <CardDescription>{t("billingDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/billing">
              <Button>{t("manageBilling")}</Button>
            </Link>
          </CardContent>
        </Card>
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
  );
}
