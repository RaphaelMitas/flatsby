"use client";

import { useCallback, useRef, useState } from "react";

import { cn } from "@flatsby/ui";
import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";

import { season } from "./seasonal/season";

export function PeekingCat({
  className,
  variant = "hero",
}: {
  className?: string;
  variant?: "hero" | "home";
}) {
  const [excited, setExcited] = useState(false);
  const [hops, setHops] = useState(0);
  const [taps, setTaps] = useState(0);
  const lastHop = useRef(0);
  const isHome = variant === "home";
  const TapReaction = isHome ? season.TapReaction : undefined;

  const playHop = useCallback(() => {
    const now = Date.now();
    if (now - lastHop.current < 250) return;
    lastHop.current = now;
    setHops((n) => n + 1);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute inset-0 cursor-pointer overflow-hidden select-none"
        onPointerEnter={() => {
          setExcited(true);
          playHop();
        }}
        onPointerLeave={() => setExcited(false)}
        onClick={() => {
          playHop();
          setTaps((n) => n + 1);
        }}
      >
        <div
          className={cn(
            "absolute inset-0",
            isHome &&
              "motion-safe:animate-in motion-safe:slide-in-from-bottom-full duration-700",
          )}
        >
          <FlatsbyCat
            key={hops}
            className={cn(
              "absolute top-0 left-1/2 h-[200%] -translate-x-1/2",
              excited && "fc-excited",
              hops > 0 && "fc-hopping",
            )}
          />
        </div>
      </div>
      {TapReaction && taps > 0 && (
        <div className="pointer-events-none absolute top-1/2 left-1/2">
          <TapReaction key={taps} />
        </div>
      )}
    </div>
  );
}
