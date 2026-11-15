import type { EffectCallback } from "react";
import { useEffect, useEffectEvent } from "react";

export function useMountEffect(effect: EffectCallback) {
  const run = useEffectEvent(effect);
  useEffect(() => run(), []);
}
