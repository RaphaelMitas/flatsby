import { useRef } from "react";

export function useOnce() {
  const inFlight = useRef(false);
  return <A extends unknown[]>(run: (...args: A) => Promise<unknown>) =>
    async (...args: A) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        await run(...args);
      } finally {
        inFlight.current = false;
      }
    };
}
