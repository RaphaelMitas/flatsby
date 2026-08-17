"use client";

import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef, useState } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

import { cn } from "@flatsby/ui";

const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, onCheckedChange, ...props }, ref) => {
  const [rippling, setRippling] = useState(false);

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      onCheckedChange={(checked) => {
        // Unticking clears it, so the ring never outlives the tick it belongs
        // to and a re-tick inside the window gets a fresh span to animate.
        setRippling(checked === true);
        onCheckedChange?.(checked);
      }}
      className={cn(
        "peer group/checkbox border-primary focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground relative h-4 w-4 shrink-0 rounded-sm border shadow transition duration-150 focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-90",
        className,
      )}
      {...props}
    >
      {rippling && (
        <span
          aria-hidden
          onAnimationEnd={() => setRippling(false)}
          className="border-primary motion-safe:animate-check-ripple pointer-events-none absolute -inset-px rounded-sm border opacity-0"
        />
      )}
      <CheckboxPrimitive.Indicator
        forceMount
        className="flex items-center justify-center text-current"
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
          {/* Transitioned rather than keyframed, so a list of already
              completed items draws nothing on mount. */}
          <path
            d="M20 6 9 17l-5-5"
            pathLength={1}
            className="[stroke-dasharray:1] [stroke-dashoffset:1] group-data-[state=checked]/checkbox:[stroke-dashoffset:0] motion-safe:transition-[stroke-dashoffset] motion-safe:duration-[250ms] motion-safe:ease-[cubic-bezier(0.65,0,0.35,1)]"
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
