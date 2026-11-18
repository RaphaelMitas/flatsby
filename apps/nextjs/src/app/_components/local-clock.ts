import { useSyncExternalStore } from "react";

import { localDate } from "@flatsby/validators/calendar";

const onReturn = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify);
  window.addEventListener("focus", notify);
  return () => {
    document.removeEventListener("visibilitychange", notify);
    window.removeEventListener("focus", notify);
  };
};

const timeOfDay = () => new Date().toTimeString().slice(0, 5);

export const useToday = () =>
  useSyncExternalStore(onReturn, localDate, () => null);

export const useTimeOfDay = () =>
  useSyncExternalStore(onReturn, timeOfDay, () => null);
