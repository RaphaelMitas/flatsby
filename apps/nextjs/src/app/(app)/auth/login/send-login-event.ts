import type { LoginEvent } from "~/app/api/login/event";

export function sendLoginEvent(event: LoginEvent) {
  // Firefox drops sendBeacon when beacon.enabled is off, and sign-in must still start
  navigator.sendBeacon?.("/api/login", JSON.stringify(event));
}
