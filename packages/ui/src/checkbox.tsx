"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

import { cn } from "@flatsby/ui";

const RIPPLE_DURATION_MS = 550;

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, onCheckedChange, ...props }, ref) => {
  const [flash, setFlash] = React.useState(false);
  const wasChecked = React.useRef(checked === true);

  // Only a transition into checked animates, so a list of already completed
  // items does not ripple on mount.
  React.useEffect(() => {
    if (checked === undefined) return;
    if (checked === true && !wasChecked.current) setFlash(true);
    if (checked !== true) setFlash(false);
    wasChecked.current = checked === true;
  }, [checked]);

  React.useEffect(() => {
    if (!flash) return;
    const timeout = setTimeout(() => setFlash(false), RIPPLE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [flash]);

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checked}
      onCheckedChange={(next) => {
        if (next === true) setFlash(true);
        onCheckedChange?.(next);
      }}
      className={cn(
        "peer border-primary focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground relative h-4 w-4 shrink-0 rounded-sm border shadow transition duration-150 focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-90",
        className,
      )}
      {...props}
    >
      {flash && (
        <span
          aria-hidden
          className="border-primary motion-safe:animate-check-ripple pointer-events-none absolute -inset-px rounded-sm border opacity-0"
        />
      )}
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path
            d="M20 6 9 17l-5-5"
            pathLength={1}
            className={cn(
              "[stroke-dasharray:1] [stroke-dashoffset:0]",
              flash && "motion-safe:animate-check-draw",
            )}
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
