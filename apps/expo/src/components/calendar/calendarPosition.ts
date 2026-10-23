import type { CalendarPosition } from "@flatsby/validators/calendar";
import { useSyncExternalStore } from "react";

// Outside the screen, so the form knows which range a new entry will land in
let position: CalendarPosition = { view: "list", start: null, month: null };
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const calendarPosition = () => position;

export function setCalendarPosition(next: CalendarPosition) {
  position = next;
  for (const listener of listeners) listener();
}

export const useCalendarPosition = () =>
  useSyncExternalStore(subscribe, calendarPosition);
