import type { LoginEvent } from "~/app/api/login/event";

export function sendLoginEvent(event: LoginEvent) {
  // Firefox drops sendBeacon when beacon.enabled is off, and a lost event must not stop sign-in
  navigator.sendBeacon?.("/api/login", JSON.stringify(event));
}
