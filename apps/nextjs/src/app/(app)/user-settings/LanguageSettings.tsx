"use client";

import type { Locale } from "@flatsby/i18n/locale";
import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { localeNames, locales } from "@flatsby/i18n/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@flatsby/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";

import { setLocalePreference } from "./actions";

export function LanguageSettings(props: { preference: Locale | null }) {
  const t = useTranslations("settings.language");
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          defaultValue={props.preference ?? "system"}
          disabled={isPending}
          onValueChange={(value) =>
            startTransition(() => setLocalePreference(value))
          }
        >
          <SelectTrigger
            className="w-full md:w-64"
            data-testid="language-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">{t("system")}</SelectItem>
            {locales.map((locale) => (
              <SelectItem key={locale} value={locale}>
                {localeNames[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
