"use client";

import Link from "next/link";
import { Info, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import { listCurrencies } from "@flatsby/validators/expenses/formatting";

import { useUpdateGroup } from "~/hooks/use-update-group";

export function ConversionBanner({
  groupId,
  groupCurrency,
  currencies,
}: {
  groupId: number;
  groupCurrency: string;
  currencies: string[];
}) {
  const t = useTranslations();
  const keepSeparateMutation = useUpdateGroup(groupId);

  const keepSeparate = () => {
    keepSeparateMutation.mutate({
      id: groupId,
      convertAutomatically: false,
    });
  };

  return (
    <Alert variant="info" data-testid="currency-banner">
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2"
        aria-label={t("expenses.conversion.keepSeparate")}
        onClick={keepSeparate}
      >
        <X />
      </Button>
      <Info className="h-4 w-4" />
      <AlertTitle className="pr-8">
        {t("expenses.conversion.bannerTitle", {
          currencies: listCurrencies(currencies, groupCurrency, t),
        })}
      </AlertTitle>
      <AlertDescription className="text-foreground">
        <p>
          {t("expenses.conversion.bannerBody", { currency: groupCurrency })}
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={keepSeparate}
            data-testid="currency-banner-keep-separate"
          >
            {t("expenses.conversion.keepSeparate")}
          </Button>
          <Button size="sm" asChild data-testid="currency-banner-turn-on">
            <Link href="/group/settings?highlight=convert">
              {t("expenses.conversion.turnOn")}
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
