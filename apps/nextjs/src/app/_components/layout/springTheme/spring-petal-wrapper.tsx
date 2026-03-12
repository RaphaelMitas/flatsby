"use client";

import { PetalEffect } from "@flatsby/ui/spring/petal-effect";

import { useSpringEffects } from "./use-spring-effects";

export function SpringPetalWrapper() {
  const { isEnabled } = useSpringEffects();

  if (!isEnabled) {
    return null;
  }

  return <PetalEffect />;
}
