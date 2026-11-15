import { useMountEffect } from "./useMountEffect";

export function OnMount({ run }: { run: () => void }) {
  useMountEffect(run);
  return null;
}
