import { cn } from "@flatsby/ui";

import styles from "./bats.module.css";

const FLIGHTS = [
  "[--dx:-100px] [--dy:-20px]",
  "[--dx:-28px] [--dy:-56px] [--delay:60ms]",
  "[--dx:48px] [--dy:-28px] [--delay:120ms]",
];

export function Bats() {
  return FLIGHTS.map((flight) => (
    <span key={flight} className={cn(styles.bat, "text-foreground", flight)}>
      <svg viewBox="0 0 19 11" aria-hidden="true">
        <path
          fill="currentColor"
          d="M0 6C3 2 6 2 8 5c1-2 2-2 3 0 2-3 5-3 8 1-3-1-5 1-6 3-1-2-2-1-3.5 1C8 8 7 7 6 9 5 7 3 5 0 6Z"
        />
      </svg>
    </span>
  ));
}
