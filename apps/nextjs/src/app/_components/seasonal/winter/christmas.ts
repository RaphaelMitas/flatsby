import { useSyncExternalStore } from "react";

function isChristmas() {
  const date = new Date();
  const month = date.getMonth();
  return month === 10 || (month === 11 && date.getDate() <= 26);
}

const subscribe = () => () => undefined;

export function useIsChristmas() {
  return useSyncExternalStore(subscribe, isChristmas, () => false);
}
