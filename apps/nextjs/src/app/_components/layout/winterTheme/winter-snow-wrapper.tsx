"use client";

import { SnowEffect } from "@flatsby/ui/winter/snow-effect";

import { useWinterEffects } from "./use-winter-effects";

/**
 * Client-side wrapper for snow effect
 * This ensures the snow effect only renders on the client to avoid hydration issues
 */
export function WinterSnowWrapper() {
  const { isEnabled } = useWinterEffects();

  if (!isEnabled) {
    return null;
  }

  return <SnowEffect />;
}
