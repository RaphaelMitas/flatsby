"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@flatsby/ui/button";
import { Calendar } from "@flatsby/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@flatsby/ui/popover";
import {
  formatCalendarDate,
  localDate,
  pickerDate,
} from "@flatsby/validators/calendar";

export function DatePopover({
  value,
  min,
  max,
  onSelect,
  testId,
}: {
  value: string;
  min?: string;
  max?: string | null;
  onSelect: (date: string) => void;
  testId: string;
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const selected = pickerDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start font-normal"
          data-testid={testId}
        >
          <CalendarIcon />
          {formatCalendarDate(value, locale, { dateStyle: "long" })}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected}
          disabled={[
            ...(min ? [{ before: pickerDate(min) }] : []),
            ...(max ? [{ after: pickerDate(max) }] : []),
          ]}
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
