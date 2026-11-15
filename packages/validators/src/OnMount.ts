import type { EffectCallback } from "react";

import { useMountEffect } from "./useMountEffect";

export function OnMount({ run }: { run: EffectCallback }) {
  useMountEffect(run);
  return null;
}
