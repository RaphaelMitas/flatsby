"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Calendar } from "@flatsby/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";
import { localDate, pickerDate } from "@flatsby/validators/calendar";

export function DatePopover({
  value,
  max,
  onSelect,
  children,
}: {
  value: string;
  max?: string | null;
  onSelect: (date: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = pickerDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected}
          disabled={max ? { after: pickerDate(max) } : undefined}
          onSelect={(date) => {
            if (!date) return;
            onSelect(localDate(date));
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
