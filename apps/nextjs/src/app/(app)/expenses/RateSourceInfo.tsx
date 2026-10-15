"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";

export function RateSourceInfo({ currency }: { currency: string }) {
  const t = useTranslations("expenses.conversion");
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={t("rateSourceTitle")}
        className="text-muted-foreground"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm">
        {t("rateSourceBody")} {t("rateSourceOwnRate", { currency })}
      </PopoverContent>
    </Popover>
  );
}
