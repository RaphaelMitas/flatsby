"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";

import { cn } from "@flatsby/ui";

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-2 has-disabled:opacity-50",
        containerClassName,
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "border-input aria-invalid:border-destructive data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:bg-input/30 dark:data-[active=true]:aria-invalid:ring-destructive/40 relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
      )}
    </div>
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-separator" role="separator" {...props}>
      <MinusIcon />
    </div>
  );
}

function InputOTPGroups({
  length,
  groupSize,
  invalid,
  slotClassName,
}: {
  length: number;
  groupSize: number;
  invalid?: boolean;
  slotClassName?: string;
}) {
  const groups = Array.from({ length: Math.ceil(length / groupSize) }, (_, g) =>
    Array.from(
      { length: Math.min(groupSize, length - g * groupSize) },
      (_, i) => g * groupSize + i,
    ),
  );
  return groups.map((slots, group) => (
    <React.Fragment key={slots.join()}>
      {group > 0 && <InputOTPSeparator />}
      <InputOTPGroup>
        {slots.map((index) => (
          <InputOTPSlot
            key={index}
            index={index}
            aria-invalid={invalid}
            className={slotClassName}
          />
        ))}
      </InputOTPGroup>
    </React.Fragment>
  ));
}

export {
  InputOTP,
  InputOTPGroup,
  InputOTPGroups,
  InputOTPSlot,
  InputOTPSeparator,
};
