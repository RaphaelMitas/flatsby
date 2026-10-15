import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { localePath } from "@flatsby/i18n/locale";
import { Button } from "@flatsby/ui/button";

import { PeekingCat } from "../peeking-cat";

export function NotFoundMessage() {
  const locale = useLocale();
  const t = useTranslations("notFound");
  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <PeekingCat className="h-14 w-28" />
      <h1 className="text-3xl font-bold">{t("heading")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
      <Button asChild>
        <Link href={localePath(locale, "/")}>{t("home")}</Link>
      </Button>
    </main>
  );
}
