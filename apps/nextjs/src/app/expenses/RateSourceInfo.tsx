"use client";

import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@flatsby/ui/tooltip";

export function RateSourceInfo({ currency }: { currency: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label="Where this rate comes from"
        className="text-muted-foreground"
      >
        <Info className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        European Central Bank reference rate for the expense date, via
        Frankfurter. Published on working days, so a weekend expense uses
        Friday&apos;s rate. Your card or bank may charge a different rate. Type
        what you actually paid in {currency} and the rate follows.
      </TooltipContent>
    </Tooltip>
  );
}
