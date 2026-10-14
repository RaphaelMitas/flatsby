"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Info, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@flatsby/ui/alert";
import { Button } from "@flatsby/ui/button";
import { listCurrencies } from "@flatsby/validators/expenses/formatting";

import { useAnalytics } from "~/hooks/use-analytics";
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
  const { capture } = useAnalytics();
  const hasCapturedShown = useRef(false);

  useEffect(() => {
    if (hasCapturedShown.current) return;
    hasCapturedShown.current = true;
    capture("currency_banner_shown", { groupId, currencies });
  }, [capture, groupId, currencies]);

  const keepSeparateMutation = useUpdateGroup(groupId);

  const keepSeparate = () => {
    capture("currency_banner_keep_separate", { groupId });
    keepSeparateMutation.mutate({
      id: groupId,
      convertAutomatically: false,
      onlyIfUndecided: true,
    });
  };

  return (
    <Alert variant="info" data-testid="currency-banner">
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2"
        aria-label="Keep separate"
        onClick={keepSeparate}
      >
        <X />
      </Button>
      <Info className="h-4 w-4" />
      <AlertTitle className="pr-8">
        Debts are now in {listCurrencies(currencies, groupCurrency)}
      </AlertTitle>
      <AlertDescription className="text-foreground">
        <p>
          Turn on automatic conversion and new expenses in other currencies
          count toward {groupCurrency} debts instead.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={keepSeparate}
            data-testid="currency-banner-keep-separate"
          >
            Keep separate
          </Button>
          <Button size="sm" asChild data-testid="currency-banner-turn-on">
            <Link
              href="/group/settings?highlight=convert"
              onClick={() => capture("currency_banner_turn_on", { groupId })}
            >
              Turn on
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
