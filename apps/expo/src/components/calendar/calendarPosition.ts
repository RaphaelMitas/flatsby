import type { CalendarPosition } from "@flatsby/validators/calendar";
import { useSyncExternalStore } from "react";

import { localDate, revealDate } from "@flatsby/validators/calendar";

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

export const revealInCalendar = (date: string) =>
  setCalendarPosition(revealDate(position, date, localDate()));

export const useCalendarPosition = () =>
  useSyncExternalStore(subscribe, calendarPosition);
