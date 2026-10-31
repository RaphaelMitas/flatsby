import { useSyncExternalStore } from "react";

// The hat, fairy lights and wreath go away after Boxing Day; the snow stays.
function isChristmas(date = new Date()) {
  const month = date.getMonth();
  return month === 10 || (month === 11 && date.getDate() <= 26);
}

const subscribe = () => () => undefined;

// The server's clock can sit across midnight from the browser's, so hydrate without the extras
export function useIsChristmas() {
  return useSyncExternalStore(
    subscribe,
    () => isChristmas(),
    () => false,
  );
}
