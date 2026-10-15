"use client";

import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";

export function RateSourceInfo({ currency }: { currency: string }) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label="Where this rate comes from"
        className="text-muted-foreground"
      >
        <Info className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="max-w-xs text-sm">
        European Central Bank reference rate for the expense date, via
        Frankfurter. Published on working days, so a weekend expense uses
        Friday&apos;s rate. Your card or bank may charge a different rate. Type
        what you actually paid in {currency} and the rate follows.
      </PopoverContent>
    </Popover>
  );
}
