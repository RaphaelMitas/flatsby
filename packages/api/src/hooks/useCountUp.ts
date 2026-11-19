import { useEffect, useRef, useState } from "react";

const DURATION = 380;
const FRAME = 16;

export function useCountUp(target: number) {
  const [value, setValue] = useState(target);
  const shown = useRef(target);

  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    const start = performance.now();
    const timer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / DURATION);
      shown.current = from + (target - from) * (1 - (1 - progress) ** 3);
      setValue(shown.current);
      if (progress === 1) clearInterval(timer);
    }, FRAME);
    return () => clearInterval(timer);
  }, [target]);

  return Math.round(value);
}
